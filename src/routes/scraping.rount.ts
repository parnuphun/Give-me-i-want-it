import express from 'express'
import scraping from '../controller/scraping'

const route = express.Router()

route.get('/scraping' , scraping)


export const scrapingRoute = route
