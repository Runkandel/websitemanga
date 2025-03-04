"use client"
import React, { useEffect, useState } from 'react'
import styles from "./component.module.css"
import { User, getAuth } from 'firebase/auth'
import { useAuthState } from 'react-firebase-hooks/auth'
import { useSearchParams } from 'next/navigation'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { initFirebase } from '@/app/firebaseApp'
import * as MediaCard from '@/app/components/MediaCards/MediaCard'
import SvgLoading from "@/public/assets/Eclipse-1s-200px.svg"
import ShowUpLoginPanelAnimated from '@/app/components/UserLoginModal/animatedVariant'

function PlaylistItemsResults({ params }: { params?: { format: string, sort: "title_desc" | "title_asc" } }) {

    const auth = getAuth()
    const [user, loading] = useAuthState(auth)

    const [userBookmarksList, setUserBookmarksList] = useState<BookmarkItem[]>([])
    const [userFilteredBookmarks, setUserFilteredBookmarks] = useState<BookmarkItem[]>([])

    const searchParams = useSearchParams();

    useEffect(() => { setUserFilteredBookmarks([]) }, [searchParams.size == 0])

    useEffect(() => { if (user?.uid) getUserBookmarksList() }, [user])

    useEffect(() => {

        if (params?.format) {
            const filteredBookmarks = userBookmarksList.filter(media => media.format == params!.format.toUpperCase())

            setUserFilteredBookmarks(filteredBookmarks)
        }

    }, [params?.format])

    useEffect(() => {

        let filteredBookmarks = !params?.format ? userBookmarksList : userFilteredBookmarks

        if (params?.sort) {
            if (params.sort == "title_desc") filteredBookmarks = filteredBookmarks.sort((a, b) => a.title.romaji > b.title.romaji ? -1 : 1)
            else if (params.sort == "title_asc") filteredBookmarks = filteredBookmarks.sort((a, b) => a.title.romaji > b.title.romaji ? -1 : 1).reverse()
        }

        setUserFilteredBookmarks(filteredBookmarks)

    }, [params?.sort])

    async function getUserBookmarksList() {

        const db = getFirestore(initFirebase());

        const bookmarksList: BookmarkItem[] = await getDoc(doc(db, 'users', (user as User).uid)).then(doc => doc.get("bookmarks"))

        if (!params) {

            setUserFilteredBookmarks([])
            setUserBookmarksList(bookmarksList)

            return
        }

        let filteredBookmarks = bookmarksList

        if (params?.format) filteredBookmarks = filteredBookmarks.filter(item => item.format == params.format.toUpperCase())

        if (params?.sort) {
            if (params.sort == "title_desc") filteredBookmarks = filteredBookmarks.sort((a, b) => a.title.romaji > b.title.romaji ? -1 : 1)
            else if (params.sort == "title_asc") filteredBookmarks = filteredBookmarks.sort((a, b) => a.title.romaji > b.title.romaji ? -1 : 1).reverse()
        }

        setUserFilteredBookmarks(filteredBookmarks)
        setUserBookmarksList(bookmarksList)

    }

    return (
        <React.Fragment>

            <ShowUpLoginPanelAnimated
                apperanceCondition={(!user && !loading) ? true : false}
                auth={auth}
            />

            {loading && (

                <div style={{ height: "400px", width: "100%", display: "flex" }}>
                    <SvgLoading width={120} height={120} style={{ margin: "auto" }} />
                </div>

            )}

            {!loading && (
                <div id={styles.container}>

                    <ul>

                        {(userFilteredBookmarks.length == 0 || userBookmarksList?.length == 0) && (
                            <p className={styles.no_results_text}>
                                No Results
                            </p>
                        )}

                        {params ? (
                            userFilteredBookmarks.length > 0 && (userFilteredBookmarks.map((media, key) => (
                                <li key={key}>

                                    <MediaCard.Container onDarkMode>

                                        <MediaCard.MediaImgLink
                                            mediaId={media.id}
                                            title={media.title.romaji}
                                            formatOrType={media.format}
                                            url={media.coverImage.extraLarge}
                                        />

                                        <MediaCard.LinkTitle
                                            title={media.title.romaji}
                                            id={media.id}
                                        />

                                    </MediaCard.Container>

                                </li>
                            )))
                        ) : (
                            userBookmarksList.map((media, key) => (
                                <li key={key}>

                                    <MediaCard.Container onDarkMode>

                                        <MediaCard.MediaImgLink
                                            mediaId={media.id}
                                            title={media.title.romaji}
                                            formatOrType={media.format}
                                            url={media.coverImage.extraLarge}
                                        />

                                        <MediaCard.LinkTitle
                                            title={media.title.romaji}
                                            id={media.id}
                                        />

                                    </MediaCard.Container>

                                </li>
                            ))
                        )}

                    </ul>

                </div>

            )}
        </React.Fragment>
    )
}

export default PlaylistItemsResults