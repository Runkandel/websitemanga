import React from 'react'
import styles from './component.module.css'
import Link from 'next/link'
import Image from 'next/image'
import { ApiDefaultResult } from '@/app/ts/interfaces/apiAnilistDataInterface'
import parse from "html-react-parser"
import * as  AddToPlaylist from '../../Buttons/AddToPlaylist'

export function Container({ children, mediaInfo, customDescription }: { children: React.ReactNode, mediaInfo: ApiDefaultResult, customDescription?: string }) {
    return (

        <div className={`${styles.midia_item_container}`}>

            <Link id={styles.img_container} href={`/media/${mediaInfo.id}`}>
                <Image
                    src={mediaInfo.coverImage && mediaInfo.coverImage.extraLarge}
                    alt={`Cover Art for ${mediaInfo.title && mediaInfo.title.romaji || mediaInfo.title.native}`}
                    fill
                    sizes='(max-width: 580px) 25vw, (max-width: 820px) 15vw, 220px'
                ></Image>
            </Link>

            <div className={`${styles.item_info_container} ${customDescription ? styles.watch_page_custom_margin : ""}`}>

                {(mediaInfo.seasonYear && (
                    <small>{mediaInfo.seasonYear}</small>
                ))}

                <h4>
                    <Link href={`/media/${mediaInfo.id}`}>
                        {mediaInfo.title && mediaInfo.title.romaji || mediaInfo.title.native}
                    </Link>
                </h4>

                {children}

            </div>

        </div>
    )

}

export function Description({ description }: { description: string }) {

    return (
        <React.Fragment>

            {/* <input type='checkbox' className={styles.expand_description} /> */}

            {/* <span className={`${styles.paragrath_container} ${styles.watch_page_custom_line_limit}`}> */}
            {parse(description) || "Description Not Available"}
            {/* </span> */}

        </React.Fragment>
    )

}

export function Buttons({ media, mediaId, mediaFormat }: { media: ApiDefaultResult, mediaId: number, mediaFormat: string }) {

    return (
        <div className={styles.buttons_container}>

            <Link href={`/media/${mediaId}`}>
                {mediaFormat == "MANGA" ? "READ" : "WATCH"} NOW
            </Link>

            <AddToPlaylist.Button
                mediaInfo={media}
            />

        </div>

    )

}