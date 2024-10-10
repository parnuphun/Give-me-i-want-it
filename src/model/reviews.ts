import {SteamVote} from './template'

export interface Review {
   id: number
   img: string
   name: string
   vote: SteamVote
   date: string
   review: string
}

export interface ScraperParams {
   steamUrl: string,
   headless: boolean,
   limit: number
}

