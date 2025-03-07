import manga from "@/app/api/consumetManga"
import { MangaSearchResult } from "../ts/interfaces/apiMangadexDataInterface"
import { ApiMediaResults } from "../ts/interfaces/apiAnilistDataInterface"

export async function getClosestMangaResultByTitle(query: string, mediaInfo: ApiMediaResults) {

    const searchResultsForMedia = await manga.searchMedia({ query: query }) as MangaSearchResult[]

    // FILTER RESULTS WITH SAME RELEASE YEAR
    const closestResults = searchResultsForMedia?.filter(
        item => item.releaseDate == mediaInfo.startDate.year
    ).sort((a, b) => Number(a.lastChapter) - Number(b.lastChapter)).reverse()

    // RETURNS RESULT WITH SAME TITLE, CHAPTERS or VOLUMES
    const resultByTitle = closestResults.find(item => item.title.toLowerCase() == mediaInfo.title.romaji.toLowerCase())?.id
    const resultByChapter = closestResults.find(item => Number(item.lastChapter) == Number(mediaInfo.chapters))?.id
    const resultByVolumes = closestResults.find(item => Number(item.lastVolume) == Number(mediaInfo.volumes))?.id

    if (closestResults) {
        return resultByTitle || resultByChapter || resultByVolumes || closestResults[0].id
    }

    return searchResultsForMedia ? searchResultsForMedia[0]?.id : null


}