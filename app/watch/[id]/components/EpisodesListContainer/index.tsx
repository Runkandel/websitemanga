"use client"
import React, { useEffect, useState } from 'react'
import styles from "./component.module.css"
import { MediaEpisodes } from '@/app/ts/interfaces/apiGogoanimeDataInterface'
import Link from 'next/link'
import MarkEpisodeAsWatchedButton from '@/app/components/Buttons/MarkEpisodeAsWatched'
import { EpisodeAnimeWatch } from '@/app/ts/interfaces/apiAnimewatchInterface'
import { motion } from 'framer-motion'
import { ImdbEpisode } from '@/app/ts/interfaces/apiImdbInterface'
import { SourceType } from '@/app/ts/interfaces/episodesSourceInterface'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { initFirebase } from '@/app/firebaseApp'
import { useAuthState } from 'react-firebase-hooks/auth'
import { getAuth } from 'firebase/auth'
import { convertFromUnix } from '@/app/lib/formatDateUnix'
import { useSearchParams } from 'next/navigation'

type ComponentTypes = {
    sourceName: SourceType["source"],
    mediaId: number,
    activeEpisodeNumber: number,
    episodesList: MediaEpisodes[] | EpisodeAnimeWatch[] | ImdbEpisode[],
    episodesListOnImdb: ImdbEpisode[] | undefined,
    nextAiringEpisodeInfo?: { episode: number, airingAt: number }
}

export default function EpisodesListContainer({ sourceName, mediaId, activeEpisodeNumber, episodesList, nextAiringEpisodeInfo, episodesListOnImdb }: ComponentTypes) {

    const [episodesWatchedList, setEpisodesWatchedList] = useState<{
        mediaId: number;
        episodeNumber: number;
        episodeTitle: string;
    }[]>()

    const auth = getAuth()
    const [user] = useAuthState(auth)

    const db = getFirestore(initFirebase())

    const searchParams = useSearchParams()

    useEffect(() => { if (user) getEpisodesWatchedList() }, [user, mediaId, sourceName])

    useEffect(() => {

        function centerActiveListItemEpisode() {
            const elementActive = document.querySelector("li[data-active=true]")

            elementActive?.scrollIntoView()

            window.scrollTo({ top: 0, behavior: 'instant' })
        }

        setTimeout(centerActiveListItemEpisode, 2000)

    }, [activeEpisodeNumber])

    async function getEpisodesWatchedList() {

        const userDoc = await getDoc(doc(db, 'users', user!.uid))

        const episodesWatchedList = userDoc.get("episodesWatched")

        if (!episodesWatchedList) return

        const currMediaWatchedEpisodesList = episodesWatchedList[mediaId] || null

        if (currMediaWatchedEpisodesList) setEpisodesWatchedList(currMediaWatchedEpisodesList)

    }

    function getMediaIdParamByMediaSource(media: EpisodeAnimeWatch | MediaEpisodes, source: SourceType["source"]) {

        switch (source) {

            case "gogoanime":

                return `${(media as MediaEpisodes).id}`

            case "aniwatch":

                return `${(media as EpisodeAnimeWatch).episodeId}`

            default:

                return null

        }

    }

    return (
        <div id={styles.episodes_list_container}>

            <div className={styles.heading_container}>
                <h3>EPISODES {searchParams.get("dub") ? "(DUB)" : ""}</h3>


                <p>on {sourceName.toUpperCase()}</p>
            </div>

            <motion.ol id={styles.list_container}>

                {episodesList?.map((episode, key) => (
                    <motion.li
                        key={key}
                        data-active={(episode as MediaEpisodes).number == activeEpisodeNumber}
                    >

                        <Link
                            title={`Episode ${(episode as MediaEpisodes).number}`}
                            href={`/watch/${mediaId}?source=${sourceName}&episode=${(episode as MediaEpisodes).number}&q=${getMediaIdParamByMediaSource((episode as MediaEpisodes), sourceName)}`}
                        >

                            <div className={styles.img_container}>
                                <span>{(episode as MediaEpisodes).number}</span>
                            </div>

                        </Link>

                        <div className={styles.episode_info_container}>
                            <Link
                                href={`/watch/${mediaId}?source=${sourceName}&episode=${(episode as MediaEpisodes).number}&q=${getMediaIdParamByMediaSource((episode as MediaEpisodes), sourceName)}`}
                            >

                                {(sourceName == "aniwatch" && (episode as EpisodeAnimeWatch).isFiller) && (
                                    <small className={styles.filler_alert_text}>Filler</small>
                                )}

                                <h4>
                                    {sourceName == "gogoanime" ?
                                        episodesListOnImdb ?
                                            episodesListOnImdb[key].title : `Episode ${(episode as MediaEpisodes).number}`
                                        :
                                        (episode as EpisodeAnimeWatch).title
                                    }
                                </h4>

                            </Link>

                            <MarkEpisodeAsWatchedButton
                                episodeNumber={(episode as MediaEpisodes).number}
                                episodeTitle={sourceName == "aniwatch" ? (episode as ImdbEpisode).title : `${(episode as MediaEpisodes).number}`}
                                mediaId={mediaId}
                                showAdditionalText={true}
                                wasWatched={episodesWatchedList?.find((item) => item.episodeNumber == (episode as MediaEpisodes).number) ? true : false}
                            />

                        </div>

                    </motion.li>
                ))}

                <NextAiringEpisodeListItem
                    nextAiringEpisodeInfo={nextAiringEpisodeInfo}
                    mediaId={mediaId}
                />


            </motion.ol>

        </div >
    )
}

function NextAiringEpisodeListItem({ mediaId, nextAiringEpisodeInfo }: {
    mediaId: number, nextAiringEpisodeInfo?: { episode: number, airingAt: number }
}) {

    return (
        nextAiringEpisodeInfo && (
            <motion.li
                data-active={false}
                className={styles.next_episode_container}
            >

                <Link
                    title={`Episode ${nextAiringEpisodeInfo.episode}`}
                    href={`/media/${mediaId}`}
                >

                    <div className={styles.img_container}>
                        <span>{nextAiringEpisodeInfo.episode}</span>
                    </div>

                </Link>

                <div className={styles.episode_info_container}>
                    <Link href={`/media/${mediaId}`}>

                        <h4>Episode {nextAiringEpisodeInfo.episode}</h4>

                        <small>On {convertFromUnix(nextAiringEpisodeInfo.airingAt)}</small>

                    </Link>
                </div>

            </motion.li>
        )
    )

}