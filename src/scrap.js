const puppeteer = require('puppeteer')

// default values
let templateCaseName = 'twoSmall' // template Type 
let userStatus = 'online' // user status
let pageIndex = 1 // Total Pages
let continouse = true // Start Loop 
let userCount = 1 // User Count 
let maxData = 1000 // max data scrap 

async function scrap(steamUrl , limit , sim){

    const browser = await puppeteer.launch({ // Start Bronser
        headless: false, // open chromium 
        timeout: 10000
    });
    const page = await browser.newPage(); // Create Page
    await page.goto(steamUrl) // Go to website
    page.on('close', () => { // When Closed The Bronwser (Headless = false)
        console.log('Page closed ....');
    });
    await btnGate(page) // Check Button Gate if soem game need to validate age !

    let users = [] 
    while(continouse){
        const totolRowPage = await getTotalRowInPage(page) // จำนวนแถวทุ้งหมดใน 1 หน้า
        for(let pageRowIndex = 1 ; pageRowIndex <= totolRowPage ; pageRowIndex++){
            const totalUserInRow = await checkTemplate(page,pageRowIndex)  // จำนวน user ในแถว
            for(let userIndex = 1; userIndex <= totalUserInRow; userIndex++){
                let user = {} // user Object
                try{
                    // get date
                    let dateSL = `#page_${pageIndex}_row_${pageRowIndex}_template_${templateCaseName} > div:nth-child(${userIndex+1}) > div.apphub_CardContentMain > div.apphub_UserReviewCardContent > div.apphub_CardTextContent > div`
                    let waitDateSL = await page.waitForSelector(dateSL)
                    let date = await page.evaluate(el => el.textContent , waitDateSL)
                    if(date.includes('Posted: ') || date.includes('โพสต์: ')){
                        if(date.includes('Posted: '))   date = date.replace('Posted: ','') 
                        else                            date = date.replace('โพสต์: ','')  
                        // user.date = date + ' ' + new Date().getFullYear()
                        user.date = date
                    }
                    // get username 
                    let statusSelectorCheck = await checkUserStatus(page,pageRowIndex,userIndex)
                    let waiteStatusSL = await page.waitForSelector(statusSelectorCheck)
                    let username = await page.evaluate(el => el.textContent , waiteStatusSL)
                    user.username = username
                    // get review 
                    let reviewSL = `#page_${pageIndex}_row_${pageRowIndex}_template_${templateCaseName} > div:nth-child(${userIndex+1}) > div.apphub_CardContentMain > div.apphub_UserReviewCardContent > div.apphub_CardTextContent`
                    let waitReviewSL = await page.waitForSelector(reviewSL)
                    let review = await page.evaluate(el => el.textContent , waitReviewSL)
                    user.review = review
                    // get avartar 
                    let avartarSL = `#page_${pageIndex}_row_${pageRowIndex}_template_${templateCaseName} > div:nth-child(${userIndex+1}) > div.apphub_CardContentAuthorBlock.tall > div.apphub_friend_block_container > div > a > div.appHubIconHolder.${userStatus} > img`
                    await page.waitForSelector(avartarSL)
                    let avartar = await page.$eval(avartarSL, el => el.getAttribute('src'))
                    user.avartar = avartar 
                    // get vote review
                    let voteSL = `#page_${pageIndex}_row_${pageRowIndex}_template_${templateCaseName} > div:nth-child(${userIndex+1}) > div.apphub_CardContentMain > div.apphub_UserReviewCardContent > div.vote_header > div.reviewInfo > div.thumb > img`
                    await page.waitForSelector(voteSL)
                    let vote = await page.$eval(voteSL,el => el.getAttribute('src'));
                    if(vote.includes('thumbsUp')) vote = '+'
                    else if(vote.includes('thumbsDown')) vote = '-'
                    else vote = 'cant read value'
                    user.vote = vote
                    
                    
                    users.push(user) //push userObj to usersArr
                    console.log(`page: ${pageIndex} row: ${pageRowIndex} user: ${userCount} ${username} success !!`); //review scraped log
                    userCount++ //user scaped count for checking limit

                }catch(err){
                    console.log('err loop in');
                    continouse = false
                    break;
                }
            }
        }

        if(((userCount >= limit) || (userCount >= maxData)) && ((limit != '') || (limit != 0) || (limit != '0'))){ // Check Limit
            console.log('exceeded limit ')
            continouse = false 
            break 
        }else{        
            previousHeight = await page.evaluate('document.body.scrollHeight')   
            try {
                await page.evaluate(`window.scrollTo(0, document.body.scrollHeight)`,{ timeout: 10000 })
            } catch (error) {
                console.log('timeout 1 ')
                continouse = false
                break 
            }
            try {
                await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`,{ timeout: 10000 })
            } catch (error) {
                console.log('timeout 2 no data or loading element slow')
                continouse = false
                break 
            }
            pageIndex ++
        }
        
    }
    // await page.close()
    await browser.close() // close 
    // Log Data After Scraped 
    console.log('Total Reviews : ',users.length)
    console.log('end')
    // Reset Default Data Before Return Data 
    templateCaseName = 'twoSmall'  
    userStatus = 'online'  
    pageIndex = 1  
    continouse = true  
    userCount = 1 
    return users
}

// *** row type
//  1. #page_?_row_?_template_twoSmall
//  2. #page_?_row_?_template_threeSmall
//  3. #page_?_row_?_template_smallFallback
//  4. #page_?_row_?_template_mediumFallback
//  5. #page_?_row_?_template_largeFallback
async function checkTemplate(page,pageRowIndex){
    templateCaseName = 'twoSmall'
    return await page.$$eval(`#page_${pageIndex}_row_${pageRowIndex}_template_twoSmall > div`, (el)=>{
        return el.filter(el => el.hasAttribute('data-panel')).length  // in user review must be attr data-panel 
    })
    // 2. threeSmall Case 
    .then((result)=>{
        if(result === 0 || result === undefined || result === null ){
            templateCaseName = 'threeSmall'
            return page.$$eval(`#page_${pageIndex}_row_${pageRowIndex}_template_threeSmall > div`, (el)=>{
                return el.filter(el => el.hasAttribute('data-panel')).length
            })
        }else{
            return result
        }
        // 3. smallFallback
    }).then((result)=>{
        if(result === 0 || result === undefined || result === null ){
            templateCaseName = 'smallFallback'
            return page.$$eval(`#page_${pageIndex}_row_${pageRowIndex}_template_smallFallback > div`, (el)=>{
                return el.filter(el => el.hasAttribute('data-panel')).length
            })
        }else{
            return result
        }
    })
    // 4. mediumFallback
    .then((result)=>{
        if(result === 0 || result === undefined || result === null ){
            templateCaseName = 'mediumFallback'
            return page.$$eval(`#page_${pageIndex}_row_${pageRowIndex}_template_mediumFallback > div`, (el)=>{
                return el.filter(el => el.hasAttribute('data-panel')).length
            })
        }else{
            return result
        }
    })
    // 5. largeFallback
    .then((result)=>{
        if(result === 0 || result === undefined || result === null ){
            templateCaseName = 'largeFallback'
            return page.$$eval(`#page_${pageIndex}_row_${pageRowIndex}_template_largeFallback > div`, (el)=>{
                return el.filter(el => el.hasAttribute('data-panel')).length
            })
        }else{
            return result
        }
    })
}

// *** user status type 
//  1. online
//  2. offline
//  3. in-game 
async function checkUserStatus(page,pageRowIndex,userIndex){
    let statusSelectorCheck = `#page_${pageIndex}_row_${pageRowIndex}_template_${templateCaseName} > div:nth-child(${userIndex+1}) > div.apphub_CardContentAuthorBlock.tall > div.apphub_friend_block_container > div > div.apphub_CardContentAuthorName.online.ellipsis > a:nth-child(2)`            
    
    // case 1 online 
    userStatus = 'online'
    await page.$$eval(statusSelectorCheck , el => el.length)
    // case 2 in-game
    .then((result)=>{
        if(result === 0){
            userStatus = 'in-game'
            statusSelectorCheck = `#page_${pageIndex}_row_${pageRowIndex}_template_${templateCaseName} > div:nth-child(${userIndex+1}) > div.apphub_CardContentAuthorBlock.tall > div.apphub_friend_block_container > div > div.apphub_CardContentAuthorName.in-game.ellipsis > a:nth-child(2)`
            return page.$$eval(statusSelectorCheck , el => el.length)
        }else{
            return result
        }
    })
    // case 3 offline
    .then((result)=>{
        if(result === 0){
            userStatus = 'offline'
            statusSelectorCheck = `#page_${pageIndex}_row_${pageRowIndex}_template_${templateCaseName} > div:nth-child(${userIndex+1}) > div.apphub_CardContentAuthorBlock.tall > div.apphub_friend_block_container > div > div.apphub_CardContentAuthorName.offline.ellipsis > a:nth-child(2)`
            return page.$$eval(statusSelectorCheck,el => el.length)
        }else{
            return result
        }
    })
    
    return statusSelectorCheck
}

// Get Total row per page
async function getTotalRowInPage(page){
    return page.$$eval(`#page${pageIndex} > div`, el => el.length)
}

// Check Button Gate Because some game need to validate
async function btnGate(page){
    return page.$$eval(`#age_gate_btn_continue` , el => el.length).then(async (result)=>{
        if(result === 0){
            continouse = true
        }else {
            const btnGate = await page.$('#age_gate_btn_continue')
            await btnGate.evaluate( btnGate => btnGate.click())
        }
    })
}

module.exports = scrap