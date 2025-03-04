"use client"
import styles from "./component.module.css"
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'
import { ApiMediaResults } from '@/app/ts/interfaces/apiAnilistDataInterface'
import { initFirebase } from '@/app/firebaseApp'
import { getAuth } from 'firebase/auth'
import {
    DocumentData,
    DocumentSnapshot,
    FieldPath,
    arrayUnion,
    doc, getDoc,
    getFirestore, setDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { MediaPlayer, MediaProvider, Track } from '@vidstack/react'
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default'
import { CaptionsFileFormat, CaptionsParserFactory } from 'media-captions'
import { AnimatePresence, motion } from "framer-motion"
import { EpisodeLinksGoGoAnime, MediaEpisodes } from "@/app/ts/interfaces/apiGogoanimeDataInterface"
import { EpisodeAnimeWatch, EpisodeLinksAnimeWatch } from "@/app/ts/interfaces/apiAnimewatchInterface"
import gogoanime from "@/app/api/consumetGoGoAnime";
import aniwatch from "@/app/api/aniwatch";
import { useRouter, useSearchParams } from "next/navigation";
import { SourceType } from "@/app/ts/interfaces/episodesSourceInterface"
import SkipSvg from "@/public/assets/chevron-double-right.svg"
import PlaySvg from "@/public/assets/play.svg"

type VideoPlayerType = {
    mediaSource: SourceType["source"],
    mediaInfo: ApiMediaResults,
    mediaEpisodes?: MediaEpisodes[] | EpisodeAnimeWatch[],
    videoInfo: {
        urlSource: string,
        currentLastStop?: string,
        subtitlesList?: EpisodeLinksAnimeWatch["tracks"] | undefined,
        videoQualities?: {
            url: string,
            quality: "360p" | "480p" | "720p" | "1080p" | "default" | "backup",
            isM3U8: boolean
        }[]
    },
    episodeInfo: {
        episodeNumber: string,
        episodeId: string,
        episodeIntro?: { start: number, end: number },
        episodeOutro?: { start: number, end: number },
        episodeImg: string,
    },
}

type SubtitlesType = {
    src: string | undefined,
    kind: string | TextTrackKind,
    label: string | undefined,
    srcLang: string | undefined,
    type: string | CaptionsParserFactory | undefined,
    default: boolean | undefined,
}

export default function VideoPlayer({ mediaSource, videoInfo, mediaInfo, mediaEpisodes, episodeInfo }: VideoPlayerType) {

    const [subtitles, setSubtitles] = useState<SubtitlesType[] | undefined>(undefined)

    const [nextEpisodeInfo, setNextEpisodeInfo] = useState<{ id: string, src: string } | undefined>(undefined)
    const [wasWatched, setWasWatched] = useState<boolean>(false)

    const [showActionButtons, setShowActionButtons] = useState<boolean>(false)

    const [episodeLastStop, setEpisodeLastStop] = useState<number>()

    const [timeskipLimit, setTimeskipLimit] = useState<number | null>(null)

    const [videoUrl, setVideoUrl] = useState<string>(videoInfo.urlSource)

    const [enableAutoSkipIntroAndOutro, setEnableAutoSkipIntroAndOutro] = useState<boolean>(false)
    const [enableAutoNextEpisode, setEnableAutoNextEpisode] = useState<boolean>(false)

    const auth = getAuth()

    const [user, loading] = useAuthState(auth)

    const db = getFirestore(initFirebase())

    const router = useRouter()

    const searchParams = useSearchParams()

    useEffect(() => {

        setVideoUrl(videoInfo.urlSource)
        setEpisodeLastStop(Number(videoInfo.currentLastStop) || 0)

    }, [videoInfo.urlSource])

    useEffect(() => { if (!loading) getUserPreferences() }, [user, loading, episodeInfo.episodeId])

    useEffect(() => { fetchNextEpisodeInfo() }, [videoUrl, episodeInfo.episodeNumber])

    // subtitles, video quality, skip intro...
    async function getUserPreferences() {

        const userDoc = user ? await getDoc(doc(db, "users", user.uid)) : null

        async function getWasCurrEpisodeWatched(userDoc: DocumentSnapshot<DocumentData, DocumentData>) {

            const episodesWatchedList = await userDoc?.get("episodesWatched")

            const episodeAddedOnWatchedList = episodesWatchedList[mediaInfo.id]?.find(
                (item: { episodeNumber: string; }) => Number(item.episodeNumber) == Number(episodeInfo.episodeNumber)
            )

            setWasWatched(episodeAddedOnWatchedList ? true : false)

        }

        async function getIsAutoSkipEnabled(userDoc: DocumentSnapshot<DocumentData, DocumentData>) {

            const userAutoSkipIntroAndOutro = await userDoc.get("autoSkipIntroAndOutro") == true || false
            const userNextEpisode = await userDoc.get("autoNextEpisode") == true || false

            setEnableAutoSkipIntroAndOutro(userAutoSkipIntroAndOutro)
            setEnableAutoNextEpisode(userNextEpisode)

        }

        async function getUserPreferredLanguage(userDoc: DocumentSnapshot<DocumentData, DocumentData> | null) {

            let subtitleLanguage = await userDoc?.get("videoSubtitleLanguage") || "English"

            let subtitleListMapped: SubtitlesType[] = []

            // get user language and filter through the available subtitles to this media
            videoInfo.subtitlesList?.map((subtitle) => {

                function itsTheDefaultLang(subtitleLabel: string, defaultSubtitle: boolean) {

                    const isChoseSubtitle = subtitleLabel?.toLowerCase().includes(subtitleLanguage.toLowerCase())

                    if (!isChoseSubtitle) return false

                    return isChoseSubtitle

                }

                subtitleListMapped.push(
                    {
                        kind: subtitle.kind,
                        srcLang: subtitle.label,
                        src: subtitle.file,
                        default: itsTheDefaultLang(subtitle.label, subtitle.default),
                        label: subtitle.label,
                        type: subtitle.kind
                    }
                )

            })

            setSubtitles(subtitleListMapped)
        }

        async function getCurrEpisodeLastStop(userDoc: DocumentSnapshot<DocumentData, DocumentData>) {

            if (videoInfo.currentLastStop) return

            let keepWatchingList = userDoc.get("keepWatching")

            let convertedListFromObjectToArray = Object.keys(keepWatchingList).map(key => {

                return keepWatchingList[key]

            })

            keepWatchingList = convertedListFromObjectToArray
                .filter(media => media.length != 0 && media)
                .find((media: KeepWatchingItem) => media.id == mediaInfo.id)

            if (keepWatchingList) return setEpisodeLastStop(keepWatchingList.episodeTimeLastStop)

        }

        getUserPreferredLanguage(userDoc)

        if (!userDoc) {

            setWasWatched(false)
            setEpisodeLastStop(0)
            setEnableAutoSkipIntroAndOutro(false)
            setEnableAutoNextEpisode(true)

        }
        else {

            getWasCurrEpisodeWatched(userDoc)
            getIsAutoSkipEnabled(userDoc)
            getIsAutoSkipEnabled(userDoc)
            getCurrEpisodeLastStop(userDoc)

        }

    }

    async function markCurrEpisodeAsWatched() {

        if (!user) return

        const episodeData = {

            mediaId: mediaInfo.id,
            episodeNumber: Number(episodeInfo.episodeNumber),
            episodeTitle: `Episode ${episodeInfo.episodeNumber}`

        }

        await setDoc(doc(db, 'users', user.uid),
            {
                episodesWatched: {
                    [mediaInfo.id]: arrayUnion(...[episodeData])
                }

            } as unknown as FieldPath,
            { merge: true }
        ).then(() => setWasWatched(true))

    }

    // runs after every 45 secs
    async function handleEpisodeTimeTrackingOnKeepWatching(currentEpisodeTime: number, videoDuration: number) {

        // if episode is ending and it has a next episode after, it saves to Keep Watching the next episode
        let saveNextEpisodeInfo = false

        if (Math.round((currentEpisodeTime / videoDuration) * 100) > 95) {
            if (nextEpisodeInfo) saveNextEpisodeInfo = true
        }

        const episodeData = {
            id: mediaInfo.id,
            title: {
                romaji: mediaInfo.title.romaji
            },
            format: mediaInfo.format,
            coverImage: {
                extraLarge: mediaInfo.coverImage.extraLarge,
                large: mediaInfo.coverImage.large
            },
            episode: saveNextEpisodeInfo ? Number(episodeInfo.episodeNumber) + 1 : episodeInfo.episodeNumber,
            episodeId: saveNextEpisodeInfo ? nextEpisodeInfo!.id : episodeInfo.episodeId,
            episodeImg: episodeInfo.episodeImg || null,
            episodeTimeLastStop: saveNextEpisodeInfo ? 0 : currentEpisodeTime,
            episodeDuration: videoDuration,
            source: mediaSource,
            updatedAt: Date.parse(new Date(Date.now() - 0 * 24 * 60 * 60 * 1000) as any) / 1000
        }

        await setDoc(doc(db, "users", user!.uid),
            {
                keepWatching: {
                    [mediaInfo.id]: episodeData
                }
            },
            { merge: true }
        )

    }

    function handleSkipEpisodeIntrosAndOutros(e: any) {

        const currentTime = Math.round(e.currentTime)
        const duration = Math.round(e.duration)

        if (episodeInfo.episodeIntro || episodeInfo.episodeOutro) {

            if (episodeInfo.episodeIntro && (currentTime >= episodeInfo.episodeIntro.start) && (currentTime < episodeInfo.episodeIntro.end)) {

                if (timeskipLimit == null) setTimeskipLimit(() => episodeInfo.episodeIntro!.end)
                if (user && enableAutoSkipIntroAndOutro && timeskipLimit != null && (currentTime >= episodeInfo.episodeIntro.start + 4)) { // adds 4 seconds to match the btn animation
                    skipEpisodeIntroOrOutro()
                }

            }
            else if (episodeInfo.episodeOutro && (currentTime >= episodeInfo.episodeOutro.start) && (currentTime < episodeInfo.episodeOutro.end)) {

                if (timeskipLimit == null) setTimeskipLimit(() => episodeInfo.episodeOutro!.end)
                if (user && enableAutoSkipIntroAndOutro && timeskipLimit != null && (currentTime >= episodeInfo.episodeOutro.start + 4)) { // adds 4 seconds to match the btn animation
                    skipEpisodeIntroOrOutro()
                }

            }
            else {
                setTimeskipLimit(null)
            }

        }

        // saves video progress on DB, when every 45 seconds passes
        if (user && (currentTime % 45 === 0)) handleEpisodeTimeTrackingOnKeepWatching(currentTime, duration)

        // show next episode button
        if (nextEpisodeInfo && Math.round((currentTime / duration) * 100) > 95) {

            setShowActionButtons(true)

            if (!wasWatched) markCurrEpisodeAsWatched()

        }
        else {
            if (showActionButtons != false) setShowActionButtons(false)
        }

    }

    async function fetchNextEpisodeInfo() {

        if (!mediaEpisodes) return

        let nextEpisodeInfo = mediaEpisodes.find((item: { number: number; }) => item.number == (Number(episodeInfo.episodeNumber) + 1))

        if (!nextEpisodeInfo) return

        if (mediaSource == "gogoanime") {

            const nextEpisodeId = (nextEpisodeInfo as MediaEpisodes).id

            const episodeInfo = await gogoanime.getEpisodeStreamingLinks({
                episodeId: nextEpisodeId,
                useAlternateLinkOption: true
            }) as EpisodeLinksGoGoAnime

            nextEpisodeInfo = episodeInfo.sources.find(item => item.quality == "default").url

            setNextEpisodeInfo({ id: nextEpisodeId, src: episodeInfo.sources[0].url })

        }
        else if (mediaSource == "aniwatch") {

            const nextEpisodeId = (nextEpisodeInfo as EpisodeAnimeWatch).episodeId

            const episodeInfo = await aniwatch.episodesLinks({
                episodeId: nextEpisodeId,
                category: searchParams.get("dub") == "true" ? "dub" : "sub"
            }) as EpisodeLinksAnimeWatch

            setNextEpisodeInfo({ id: nextEpisodeId, src: episodeInfo.sources[0].url })

        }

    }

    function skipEpisodeIntroOrOutro() {

        setEpisodeLastStop(timeskipLimit as number)
        setTimeskipLimit(null)

    }

    function handlePlayNextEpisode() {

        if (!nextEpisodeInfo) return

        router.push(`/watch/${mediaInfo.id}?source=${mediaSource}&episode=${Number(episodeInfo.episodeNumber) + 1}&q=${nextEpisodeInfo.id}`)
        setVideoUrl(nextEpisodeInfo.src)

    }

    return (
        (!loading && subtitles) && (
            <MediaPlayer
                playsInline
                autoPlay
                src={videoUrl}
                className={styles.container}
                title={mediaInfo.title.romaji}
                currentTime={episodeLastStop}
                onVolumeChange={(e) => localStorage.setItem("videoPlayerVolume", `${e.volume}`)}
                volume={Number(localStorage.getItem("videoPlayerVolume")) || 0.5}
                onProgressCapture={(e) => handleSkipEpisodeIntrosAndOutros(e.target)} // saves state of video every 45 secs, and shows SKIP btn on intros/outros            
                onEnded={() => enableAutoNextEpisode && handlePlayNextEpisode()} // saves state of video every 45 secs, and shows SKIP btn on intros/outros
            >

                <SkipIntroOrOutroButton
                    callFunction={() => skipEpisodeIntroOrOutro()}
                    isActive={timeskipLimit != null}
                    isAnimationActive={enableAutoSkipIntroAndOutro}
                />

                <NextEpisodeButton
                    callFunction={() => handlePlayNextEpisode()}
                    isActive={(nextEpisodeInfo && showActionButtons) ? true : false}
                />

                <MediaProvider>
                    {subtitles?.map((subtitle) => (
                        <Track
                            key={subtitle.src}
                            src={subtitle.src}
                            kind={subtitle.kind as TextTrackKind}
                            label={subtitle.label}
                            lang={subtitle.srcLang}
                            type={subtitle.kind as CaptionsFileFormat}
                            default={subtitle.default}
                        />
                    ))}
                </MediaProvider>

                <DefaultVideoLayout
                    icons={defaultLayoutIcons}
                    thumbnails={mediaInfo.bannerImage || undefined}
                />

            </MediaPlayer >
        )
    )
}

function SkipIntroOrOutroButton({ isActive, isAnimationActive, callFunction }: { isActive: boolean, isAnimationActive: boolean, callFunction: () => void }) {

    return (
        <AnimatePresence>
            {isActive && (

                <motion.button
                    id={styles.skip_btn}
                    onClick={callFunction}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 1.5 } }}
                    exit={{ opacity: 0 }}
                    whileTap={{ scale: 0.95 }}
                >

                    <motion.span
                        className={styles.moving_bar}
                        initial={{ scaleX: 0 }}
                        animate={isAnimationActive ?
                            { scaleX: 1, transition: { duration: 4 } }
                            :
                            { scaleX: 1, backgroundColor: "transparent" }
                        }
                    />

                    <motion.span className={styles.btn_text}>
                        {isAnimationActive ? "Auto Skip" : "Skip"} <SkipSvg width={16} height={16} />
                    </motion.span>

                </motion.button>

            )}
        </AnimatePresence>
    )

}

function NextEpisodeButton({ isActive, callFunction }: { isActive: boolean, callFunction: () => void }) {

    return (
        isActive && (

            <motion.button
                id={styles.next_episode_btn}
                onClick={callFunction}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 1.5 } }}
                exit={{ opacity: 0 }}
                whileTap={{ scale: 0.95 }}
            >

                <PlaySvg width={16} height={16} /> Next Episode

            </motion.button>

        )
    )

}