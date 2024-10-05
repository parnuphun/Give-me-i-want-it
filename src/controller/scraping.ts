import puppeteer from "puppeteer";
import { Request, Response } from "express";
import { Page, PuppeteerNode } from "puppeteer";
import { SteamCards, UserStatus } from "../model/template";
import { Review } from "../model/reviews";

/**
 * Flow of the code
 * 1. Retrieve the total number of rows from the page.
 *    1.1 Use the function getTotalRowsInPage() to get all rows containing cards.
 *    1.2 The function will return the total number of cards within each row.
 * 2. Loop through the total number of cards in each row.
 *    2.1 Use the function checkTemplate() to determine the number of users in the row.
 *       2.1.1 Access the template row by template type, e.g., `#page_1_row_1_template_twoSmall`.
 *    2.2 Then, use the array filter to check for the attribute `data-panel`, which indicates a user card.
 * 3. Loop through the users to gather data, and finally return the data to the client.
 */

// set default
let currentPage: number = 1;
let reviewsData: Review[] = [];
let templateCaseName: SteamCards = "twoSmall"; // for check template type in loop data and function checktemplate()
let userStatus: UserStatus = "online"; // for check user status in function checkUserStatus()
let userCount: number = 1;
let loop: boolean = true; // declear global bc fucntion btngate()

export default async function scraping() {
   const url: string = "https://steamcommunity.com/app/349040/reviews/";

   let limit: number = 50;
   const timeout: number = 10000;
   try {
      // open chromium
      // if you set headless true that mean not open chromium and you set false chromium will open and simulate
      const browser = await puppeteer.launch({
         headless: false,
         timeout: timeout,
      });

      const page = await browser.newPage();
      await page.goto(url);
      await page.setViewport({ width: 1080, height: 1024 });

      // listening page close event
      page.on("close", () => {
         console.log("Page closed...");
      });
      // if any game must validate age use btn gate
      await btnGate(page)

      while (loop) {
         const totalRowsInPage = await getTotalRowsInPage(page);
         for (let row = 1; row <= totalRowsInPage; row++) {
            // get uses in row
            const totalUserInRow = await checkTemplate(page, row);
            // console.log(`total user in page:${currentPage}, row:${row} ==`,totalUserInRow);
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
                  // get user data
                  // div:nth-child(2) must start at number 2 that why i used user+1
                  review.id = userCount

                  // get date
                  let dateSL = `#page_${currentPage}_row_${row}_template_${templateCaseName} > div:nth-child(${user + 1}) > div.apphub_CardContentMain > div.apphub_UserReviewCardContent > div.apphub_CardTextContent > div`;
                  let waitDateSL = await page.waitForSelector(dateSL);
                  let date = await page.evaluate((el) => el.textContent,waitDateSL);
                  review.date = date; // กำหนดค่า date


                  // get username
                  let statusSelectorCheck = await checkUserStatus(page,row,user);
                  let waiteStatusSL = await page.waitForSelector(statusSelectorCheck);
                  let username = await page.evaluate((el) => el.textContent,waiteStatusSL);
                  review.name = username;

                  // get review
                  let reviewSL = `#page_${currentPage}_row_${row}_template_${templateCaseName} > div:nth-child(${user + 1}) > div.apphub_CardContentMain > div.apphub_UserReviewCardContent > div.apphub_CardTextContent`;
                  let waitReviewSL = await page.waitForSelector(reviewSL);
                  let reviewText = await page.evaluate((el) => el.textContent,waitReviewSL);
                  review.review = reviewText;

                  // get avartar
                  let avartarSL = `#page_${currentPage}_row_${row}_template_${templateCaseName} > div:nth-child(${user + 1}) > div.apphub_CardContentAuthorBlock.tall > div.apphub_friend_block_container > div > a > div.appHubIconHolder.${userStatus} > img`;
                  await page.waitForSelector(avartarSL);
                  let img = await page.$eval(avartarSL, (el) =>el.getAttribute("src"));
                  review.img = img;

                  // get vote review
                  let voteSL = `#page_${currentPage}_row_${row}_template_${templateCaseName} > div:nth-child(${user + 1}) > div.apphub_CardContentMain > div.apphub_UserReviewCardContent > div.vote_header > div.reviewInfo > div.thumb > img`;
                  await page.waitForSelector(voteSL);
                  let vote = await page.$eval(voteSL, (el) => el.getAttribute("src"));
                  review.vote = vote.includes("thumpsUp") ? "thumpsUp": "thumpsDown";

                  reviewsData.push(review);

                  userCount++;
               } catch (err) {
                  console.error(err);
                  loop = false;
                  break;
               }
            }
         }


         // // stop looping
         // if (userCount >= limit) {
         //    break;
         // } else {

         // }
         // get height page
         let previousHeight: any = await page.evaluate("document.body.scrollHeight");
         try {
            await scrollToBottom(page, timeout);
            await waitForNewContent(previousHeight, page, timeout);
         } catch (error) {
            loop = false;
            console.table(reviewsData);

            break;
         }
         currentPage++;
      }

      await browser.close();
   } catch (error: any) {
      if (error.message.includes("Target closed")) {
         console.error("ERROR : the page or browser was closed unexpectedly.");
      } else {
         console.log(error);
      }
   }
}

// ==== get data from elememt ====
// this fucntion will get number of row in page for looping
async function getTotalRowsInPage(page: Page) {
   return page.$$eval(`#page${currentPage} > div`, (el) => el.length);
}

// this funtion will check template on row and return number of users in row
async function checkTemplate(page: Page, pageRowIndex: number) {
   const templates: SteamCards[] = [
      "twoSmall",
      "threeSmall",
      "smallFallback",
      "mediumFallback",
      "largeFallback",
   ];

   for (const temp of templates) {
      // defind selector
      const result = await page.$$eval(`#page_${currentPage}_row_${pageRowIndex}_template_${temp} > div`,(elements) => {
            // steamCard must have attribute data-panel
            return Array.from(elements).filter((el) => el.hasAttribute("data-panel")).length;
         }
      );
      if (result > 0) {
         // if template matched set template value and return result
         templateCaseName = temp;
         return result;
      }
   }
   return 0; // ***DANGER
}

// check user status and return selector for waitingFuntion()
async function checkUserStatus(page: Page, row: number, userIndex: number) {
   const statuses:UserStatus[] = ['online', 'in-game', 'offline'];

   for (const status of statuses) {
      const statusSelectorCheck = `#page_${currentPage}_row_${row}_template_${templateCaseName} > div:nth-child(${userIndex + 1}) > div.apphub_CardContentAuthorBlock.tall > div.apphub_friend_block_container > div > div.apphub_CardContentAuthorName.${status}.ellipsis > a:nth-child(2)`;
      const result = await page.$$eval(statusSelectorCheck, (el) => el.length);

      if (result > 0) {
         userStatus = status;
         return statusSelectorCheck;  // Return the selector if found
      }
   }

   return ''; // Return empty string if no status is found
}

// ==== get data from elememt ====
// auto scroll down
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

// wait for new content
async function waitForNewContent(
   previousHeight: any,
   page: Page,
   timeout: number
) {
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

// ==== other ====
// check button gate because some game need to validate
async function btnGate(page:Page){
   return page.$$eval(`#age_gate_btn_continue` , el => el.length).then(async (result)=>{
       if(result === 0){
           loop = true
       }else {
           const btnGate = await page.$('#age_gate_btn_continue')
           if (btnGate) {
            await btnGate.click();
        }
       }
   })
}
