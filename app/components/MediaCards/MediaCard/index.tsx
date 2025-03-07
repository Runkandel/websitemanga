import React from 'react'
import styles from './component.module.css'
import Link from 'next/link'
import Image from 'next/image'
import MediaFormatIcon from '../../DynamicAssets/MediaFormatIcon'
import { ApiDefaultResult } from '@/app/ts/interfaces/apiAnilistDataInterface'

type ComponentTypes = {
    children: React.ReactNode
    positionIndex?: number,
    onDarkMode?: boolean,
    isLoading?: boolean,
    isHiddenOnDesktop?: boolean
}

export function Container({ children, positionIndex, onDarkMode, isLoading, isHiddenOnDesktop }: ComponentTypes) {

    const customStyle = positionIndex && { gridArea: `item${positionIndex}` }

    return (
        <div
            className={`${styles.media_item_container} ${onDarkMode ? styles.darkMode : ''} ${isHiddenOnDesktop ? styles.media_item_container_hidden : ""}`}
            style={customStyle || undefined}
            data-loading={isLoading || false}
        >

            {children}

        </div >
    )

}

export function MediaInfo({ mediaInfo }: { mediaInfo: ApiDefaultResult }) {

    return (
        <div className={styles.rank_item_info}>
            <small>{mediaInfo.seasonYear || "Not Available"}</small>

            <h4>
                <Link href={`/media/${mediaInfo.id}`}>
                    {mediaInfo.title && (mediaInfo.title.romaji || mediaInfo.title.native || "Not Available")}
                </Link>
            </h4>

            {mediaInfo.genres && (
                <div className={styles.genre_container}>

                    {mediaInfo.genres.slice(0, 3).map((item: string, key) => (
                        <small className={styles.genre} key={key}>
                            {item}
                        </small>
                    ))}
                </div>
            )}

        </div>
    )

}

export function MediaImg({ url, formatOrType, title }: { url: string, formatOrType: string, title: string }) {

    return (
        <div id={styles.img_container}>
            <Image
                src={url}
                placeholder='blur'
                blurDataURL="https://upload.wikimedia.org/wikipedia/commons/8/8d/ERR0R_NO_IMAGE_FOUND.jpg"
                alt={`Cover Art for ${title || "Not Available"}`}
                fill
                sizes='(max-width: 400px) 40vw, 140px'
                title={title}
            />

            <span className={styles.media_type_icon}>

                <MediaFormatIcon format={formatOrType} />

                <span className={styles.media_format_title}>

                    {formatOrType == "TV" ? "ANIME" : formatOrType}

                </span>

            </span>

        </div>
    )

}

export function MediaImgLink({ url, mediaId, formatOrType, title }: { url: string, mediaId: number | string, formatOrType: string, title: string }) {

    return (
        <Link
            id={styles.img_container}
            href={`/media/${mediaId}`}
        >
            <Image
                src={url}
                placeholder='blur'
                blurDataURL="https://upload.wikimedia.org/wikipedia/commons/8/8d/ERR0R_NO_IMAGE_FOUND.jpg"
                alt={`Cover Art for ${title || "Not Available"}`}
                fill
                sizes='(max-width: 520px) 45vw, (max-width: 772px) 33vw, (max-width: 1200px) 141px, 192px'
                title={title}
            />

            <span className={styles.media_type_icon}>

                <MediaFormatIcon format={formatOrType} />

                <span className={styles.media_format_title}>

                    {formatOrType == "TV" ? "ANIME" : formatOrType}

                </span>

            </span>

        </Link>
    )

}

export function SmallTag({ seasonYear, tags }: { seasonYear: number, tags: string }) {

    return (
        tags && (
            <small>{seasonYear || "Not Available"}, {tags.slice(0, 1).toUpperCase() + tags.slice(1)}</small>
        ))

}

export function LinkTitle({ title, id, anilistId }: { title: string, id?: number, anilistId?: string }) {

    return (
        <Link
            className={anilistId ? styles.disabled : ""}
            href={`/media/${anilistId || id}`}
        >
            {title}
        </Link>
    )

}

export function Title({ title }: { title: string }) {

    return (
        <p className={styles.title_variant}>{title}</p>
    )

}