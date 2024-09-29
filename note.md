## Note
- example link [https://steamcommunity.com/app/730/reviews/?filterLanguage=all&p=1&browsefilter=mostrecent](https://steamcommunity.com/app/730/reviews/?filterLanguage=all&p=1&browsefilter=mostrecent)
- 1000 limit reviews.
- Simulate value should be 'off' to prevent err.
- if headless set to 'false' , pupeterr will open simlation brownser
- When you export a csv file, the review field is not displayed and languages other than English are rendered incorrectly.
- Element 
  - `div:nth-child(2)` number 2 is the first position of the template type.
  - Template Type  `twoSmall` , `threeSmall` , `smallFallback` , `mediumFallback`  and  `largeFallback`.
  - User Type  `online` , `offline` and `in-game`.