import {SteamVote} from './template'

export interface Review {
   id: number
   img: string
   name: string
   vote: SteamVote
   date: string
   review: string
}

