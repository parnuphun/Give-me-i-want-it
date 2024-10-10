import puppeteer from "puppeteer";
import { Page, PuppeteerNode } from "puppeteer";
import { SteamCards, UserStatus } from "../model/template";
import { Review } from "../model/reviews";
import { Server, Socket } from "socket.io";
import { ScraperParams } from "../model/reviews";

/**
 * Flow การทำงานหลักๆ
 * 1. ดึงจำนวนของแถวทั้งหมดในหนึ่งหน้ามาก่อน
 * - เรียกใช้ฟังก์ชัน getTotalRowsInPage() ฟังก์ชันี้จะ return จำนวนการ์ดหรือจำนวน user ออกมาใน Card Template นั้นๆ
 * 2. วนลูปตามจำนวนแถวในหนึ่งหน้านั้นๆ
 * - เรียกใช้ฟังก์ชัน checkTemplate() เพื่อเช็คประเภท Template (`#page_1_row_1_template_twoSmall`) ของแต่ละ user ในแถวนั้นๆ
 * - จากนั้นในฟังก์ชันจะเช็คว่า element นั้นมี attribute `data-panel` ไหมซึ่งหมายถึงการ์ดแต่ละใบ
 * 3. วนลูปตามจำนวน users ในแถวเพื่อดึงข้อมูลออกมาทีละคน พอเสร็จก็วนลูปไปแถวไหม
 * 4. เมื่อหมดจำนวนแถวในหนึ่งหน้าก็จะไปเรียกใช้ฟังก์ชัน scrollToBottom() กับ waitForNewContent() เพื่อเลื่อนลงไปหน้าใหม่ๆ จากนั้นก็วนข้อ 1 ใหม่
 */

// set default
let currentPage: number = 1;
let reviewsData: Review[] = [];
let templateCaseName: SteamCards = "twoSmall"; // สำหรับเช็ค template แต่ละอันของแต่ละแถว checktemplate()
let userStatus: UserStatus = "online"; // สำหรับเช็คสถานะผู้ใช้งานในการ์ดแต่ละใบด้วยฟังก์ชัน checkUserStatus() ใช้สำหรับดึงรูปภาพ
let userCount: number = 1;
let socketCancelEvent: boolean = false; // สำหรับการหยุดลูปเมื่อมีการกดยกเลิกมาจากทางฝั่ง client
let noMoreData: boolean = false // สำหรับเช็คสถานะการปล่อย event success ของ scroll bar


export default async function scraping(socket:Socket , params:ScraperParams) {
   socket.setMaxListeners(Number(params.limit));

   socket.on('cancel scraping' ,(msg)=>{
      console.log(msg);
      socketCancelEvent = true
   })

   const url: string = params.steamUrl
   let limit: number = params.limit
   const timeout: number = 10000;
   try {
      // เปิด chromium ถ้าตั้ง headless = false
      const browser = await puppeteer.launch({
         headless: params.headless,
         timeout: timeout,
      });

      const page = await browser.newPage();
      await page.goto(url);
      await page.setViewport({ width: 1080, height: 1024 });

      page.on("close", () => {
         if(noMoreData === true){
            console.log('complete event : page close');
            ScrapingSuccess(socket,'Scraping is complete.')
         }
         noMoreData = false
      });

      // สำหรับเกมที่มีการตรวจสอบอายุ บางเกมต้องกดปุ่มในหน้านั้นๆ
      await btnGate(page)

      while (true) {
         // ดึงจำนวนแถวในหน้าๆนั้น
         const totalRowsInPage = await getTotalRowsInPage(page);
         for (let row = 1; row <= totalRowsInPage; row++) {
            // ดึงจำนวนผู้ใช้งานในแถวนั้นๆ

            if((userCount-1) >= limit){
               break
            }

            const totalUserInRow = await checkTemplate(page, row);
            for (let user = 1; user <= totalUserInRow; user++) {
               let review: Review = {
                  id: 0,
                  name: "",
                  img: "",
                  date: "",
                  review: "",
                  vote: "thumpsUp",
               };
               try {
                  // ดึงข้อมูล
                  // div:nth-child(2) ไม่รู้ทำไม set 2 ไปก่อนถึงเป็นค่าเริ่มต้น
                  review.id = userCount

                  let dateSL = `#page_${currentPage}_row_${row}_template_${templateCaseName} > div:nth-child(${user + 1}) > div.apphub_CardContentMain > div.apphub_UserReviewCardContent > div.apphub_CardTextContent > div`;
                  let waitDateSL = await page.waitForSelector(dateSL);
                  let date = await page.evaluate((el) => el.textContent,waitDateSL);
                  review.date = date;

                  let statusSelectorCheck = await checkUserStatus(page,row,user);
                  let waiteStatusSL = await page.waitForSelector(statusSelectorCheck);
                  let username = await page.evaluate((el) => el.textContent,waiteStatusSL);
                  review.name = username;

                  let reviewSL = `#page_${currentPage}_row_${row}_template_${templateCaseName} > div:nth-child(${user + 1}) > div.apphub_CardContentMain > div.apphub_UserReviewCardContent > div.apphub_CardTextContent`;
                  let waitReviewSL = await page.waitForSelector(reviewSL);
                  let reviewText = await page.evaluate((el) =>
                     {
                        // ใน selector ตัวนี้มี el ติดมาหนึ่งตัวคือเวลาเลยต้องลบออก
                        // โดยการลบ div ที่มี class `date_posted` ออกไปเพื่อเอารีวิวด้านหลัง
                        let datePosted = el.querySelector('.date_posted');
                        if (datePosted) {
                              datePosted.remove();
                        }
                        return el.textContent.trim();
                     },waitReviewSL
                  );
                  review.review = reviewText;

                  let imgSL = `#page_${currentPage}_row_${row}_template_${templateCaseName} > div:nth-child(${user + 1}) > div.apphub_CardContentAuthorBlock.tall > div.apphub_friend_block_container > div > a > div.appHubIconHolder.${userStatus} > img`;
                  await page.waitForSelector(imgSL);
                  let img = await page.$eval(imgSL, (el) =>el.getAttribute("src"));
                  review.img = img;

                  let voteSL = `#page_${currentPage}_row_${row}_template_${templateCaseName} > div:nth-child(${user + 1}) > div.apphub_CardContentMain > div.apphub_UserReviewCardContent > div.vote_header > div.reviewInfo > div.thumb > img`;
                  await page.waitForSelector(voteSL);
                  let vote = await page.$eval(voteSL, (el) => el.getAttribute("src"));
                  review.vote = vote.includes("icon_thumbsUp.png") ? "thumpsUp": "thumpsDown";
                  reviewsData.push(review);

                  console.log(`[${userCount}] user: ${review.name} , `);

                  socket.emit('data recieve',review)
                  userCount++;

                  if((userCount-1) >= limit){
                     break;
                  }

                  if(socketCancelEvent === true){
                     // user = totalUserInRow+1
                     // row = totalRowsInPage+1
                     socketCancelEvent = false

                     console.log('complete event : socketCancelEvent === true');
                     await ScrapingSuccess(socket,'Scraping Complete!')
                     return
                  }

               } catch (err) {
                  console.error(err);
                  break;
               }
            }

         }

         // beak checker
         // cancel event from client
         if((userCount-1) >= limit){
            console.log('Beak Event : userCount > limit');
            await ScrapingSuccess(socket,'Scarping Complate.')
            break
         }

         // if(socketCancelEvent === true ){;
         //    console.log('Beak Event : Socket Cancle ');
         //    socket.removeAllListeners('cancel scraping');
         //    break
         // }

         // ฟังก์ชันสำหรับการเลื่อนหน้าจอลง ถ้าไม่มีหน้าต่อไปให้เลื่อนลงจนหมดเวลาก็ให้หยุดทำงาน
         let previousHeight: any = await page.evaluate("document.body.scrollHeight");
         try {
            await scrollToBottom(page, timeout);
            await waitForNewContent(previousHeight, page, timeout);
         } catch (error) {
            noMoreData = true
            console.log('complete event : scroll out ');
            ScrapingSuccess(socket,'There is no data left to scrape. Scraping is complete.')
            socket.removeAllListeners('cancel scraping');
            break
         }
         currentPage++;
      }
      socketCancelEvent = false
      await browser.close();
      return reviewsData
   } catch (error: any) {
      if (error.message.includes("Target closed")) {
         console.error("ERROR : the page or browser was closed unexpectedly.");
      } else {
         console.log(error);
      }
   }
}

// ==== ฟังก์ชันในส่วนของการดึงข้อมูล ====
// ดึงจำนวนแถวใน page นนั้นๆออกมาเพื่อไปวนลูปหาจำนวน users
// จำนวน div ที่อยู่ภายใต้ div id="page${}" หมายถึงจำนวนแถว
async function getTotalRowsInPage(page: Page) {
   return page.$$eval(`#page${currentPage} > div`, (el) => el.length);
}

// เช็ค template แต่ละประเภทว่าแต่ละการ์ดของ user ใช้ประเภทไหนเพื่อจะได้เข้าถึง data
// วนลูปเช็คทีละประเภท
// การ์ดที่มี attribute data-panel หมายถึงการ์ด user
// ถ้าตรงก็ return กลับออกไปเลย
// เซ็ทประเภท template ให้กับ selector อื่นๆรู้ด้วย
async function checkTemplate(page: Page, pageRowIndex: number) {
   const templates: SteamCards[] = [
      "twoSmall",
      "threeSmall",
      "smallFallback",
      "mediumFallback",
      "largeFallback",
   ];
   for (const temp of templates) {
      const result = await page.$$eval(`#page_${currentPage}_row_${pageRowIndex}_template_${temp} > div`,(elements) => {
            return Array.from(elements).filter((el) => el.hasAttribute("data-panel")).length;
         }
      );
      if (result > 0) {
         templateCaseName = temp;
         return result;
      }
   }
   return 0; //*** กรณีเจอ template อื่นๆนอกเหนือจากนี้ก็เตรียมฉิบหาย */
}

// วนลูปเช็คสถานะ user แล้ว return seletor ออกไปทั้งดุ้น
// *** ไม่รู้ทำไมทำงี้ แต่ขี้เกียจแล้ว ชางมันๆ
async function checkUserStatus(page: Page, row: number, userIndex: number) {
   const statuses:UserStatus[] = ['online', 'in-game', 'offline'];

   for (const status of statuses) {
      const statusSelectorCheck = `#page_${currentPage}_row_${row}_template_${templateCaseName} > div:nth-child(${userIndex + 1}) > div.apphub_CardContentAuthorBlock.tall > div.apphub_friend_block_container > div > div.apphub_CardContentAuthorName.${status}.ellipsis > a:nth-child(2)`;
      const result = await page.$$eval(statusSelectorCheck, (el) => el.length);

      if (result > 0) {
         userStatus = status;
         return statusSelectorCheck;
      }
   }

   return '';
}

// ไว้สำหรับการเลื่อนลงเฉยๆเวลาดึงข้อมูลแต่ละหน้าเสร็จ
async function scrollToBottom(page: Page, timeout: number) {
   try {
      await page.evaluate(
         () => window.scrollTo(0, document.body.scrollHeight),
         { timeout }
      );
   } catch (error) {
      console.log("auto scroll to bottom timeout[1] : unable to scrool");
      throw new Error("Scroll timeout");
   }
}

// ใช้สำหรับเช็คว่าสามารถเลื่อนลงได้ไหม data หมดยัง ถ้าหมดก็หยุดทำงาน
async function waitForNewContent(previousHeight: any, page: Page, timeout: number) {
   try {
      await page.waitForFunction(
         `document.body.scrollHeight > ${previousHeight}`,
         { timeout }
      );
   } catch {
      console.log(
         "auto scroll to bottom timeout[2] : no more data or loading element too slow"
      );
      throw new Error("New content timeout");
   }
}


// กดปุ่มอัตโนมัติสำหรัยเกมที่มีการตรวจสอบอายุ
//*** */ ฟังก์ชันนี้ยังหลอนอยู่
async function btnGate(page:Page){
   return page.$$eval(`#age_gate_btn_continue` , el => el.length).then(async (result)=>{
      if(result !== 0){
         const btnGate = await page.$('#age_gate_btn_continue')
         if (btnGate) {
            await btnGate.click();
         }
      }
   })
}

async function ScrapingSuccess(socket:Socket,msg:string) {
   reset()
   socket.emit('scraping complete',msg)
}

async function reset() {
   socketCancelEvent = false
   noMoreData = false
   currentPage = 1
   userCount = 1
   reviewsData = []
}
