import styles from "./component.module.css"
import { initFirebase } from "@/app/firebaseApp"
import { ApiDefaultResult, ApiMediaResults } from "@/app/ts/interfaces/apiAnilistDataInterface"
import { getAuth } from "firebase/auth"
import { useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import Image from 'next/image';
import {
    getFirestore, doc, arrayUnion, FieldPath, setDoc,
    DocumentData, addDoc, collection,
    updateDoc
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import ProfileFallbackImg from "@/public/profile_fallback.jpg"
import SvgCheck from "@/public/assets/check-circle-fill.svg"
import Filter from "bad-words"

type CommentFormTypes = {
    isAReply?: boolean,
    commentToBeRepliedDocId?: string | DocumentData | undefined,
    isLoadingHook: boolean,
    setIsLoadingHook: React.Dispatch<React.SetStateAction<boolean>>,
    setIsUserModalOpenHook: React.Dispatch<React.SetStateAction<boolean>>,
    loadComments: () => Promise<DocumentData[] | undefined>,
    mediaInfo: ApiMediaResults | ApiDefaultResult,
    isOnWatchPage?: boolean,
    episodeId?: string,
    episodeNumber?: number
}

export default function WriteCommentFormContainer({
    isAReply, commentToBeRepliedDocId, isLoadingHook, setIsLoadingHook, setIsUserModalOpenHook, loadComments, mediaInfo, isOnWatchPage, episodeId, episodeNumber }:
    CommentFormTypes
) {

    const [wasCommentCreatedSuccessfully, setWasCommentCreatedSuccessfully] = useState<boolean>(false)
    const [currTextLength, setCurrTextLength] = useState<number>(0)
    const [inputCharLimit] = useState<number>(400)

    const auth = getAuth()

    const [user] = useAuthState(auth)

    const db = getFirestore(initFirebase())

    function isCommentTextValid(text: string) {

        if (text == "" || text.length > inputCharLimit) return false

        return true

    }

    async function handleCreateComment(e: React.FormEvent<HTMLFormElement>) {

        e.preventDefault()

        if (!user) return setIsUserModalOpenHook(true)

        const form = e.target as any

        if (isCommentTextValid(form.comment.value) == false) return

        const swearFilter = new Filter()

        const commentText = swearFilter.clean(form.comment.value)

        setIsLoadingHook(true)

        const commentTimestamp = Math.floor(new Date().getTime() / 1000.0)

        const completeCommentData = {

            userId: doc(db, "users", user.uid),
            username: user.displayName,
            userPhoto: user.photoURL,
            createdAt: commentTimestamp,
            comment: commentText,
            isSpoiler: form.spoiler.checked,
            likes: 0,
            dislikes: 0,
            replies: [],
            fromEpisode: isOnWatchPage || null,
            episodeId: episodeId || null,
            episodeNumber: episodeNumber || null

        }

        const replyCommentData: ReplyComment = {

            userId: doc(db, "users", user.uid),
            username: user.displayName,
            userPhoto: user.photoURL,
            createdAt: commentTimestamp,
            comment: commentText,
            isSpoiler: form.spoiler.checked,
            replies: [],
        }

        if (isAReply) {

            const commentCreatedDoc = await addDoc(collection(db, 'comments', `${mediaInfo.id}`, "replies"), replyCommentData)

            if (!commentCreatedDoc) return

            await updateDoc(doc(db, 'comments', `${mediaInfo.id}`, "all", `${commentToBeRepliedDocId}`),
                {
                    replies: arrayUnion(...[completeCommentData])

                } as unknown as FieldPath,
                { merge: true }
            ).catch(async () =>

                await updateDoc(doc(db, 'comments', `${mediaInfo.id}`, "replies", `${commentToBeRepliedDocId}`),
                    {
                        replies: arrayUnion(...[completeCommentData])

                    } as unknown as FieldPath,
                    { merge: true }
                )

            )

        }
        else {

            const commentCreatedDoc = await addDoc(collection(db, 'comments', `${mediaInfo.id}`, "all"), completeCommentData)

            if (!commentCreatedDoc) return

            form.comment.value = ""
            setWasCommentCreatedSuccessfully(true)

            await setDoc(doc(db, 'users', user.uid), {
                comments: {
                    written: arrayUnion(...[{
                        commentRef: commentCreatedDoc.id,
                        media: {
                            id: mediaInfo.id,
                            coverImage: {
                                extraLarge: mediaInfo.coverImage.extraLarge
                            },
                            title: {
                                romaji: mediaInfo.title.romaji
                            }
                        }
                    }])
                }
            } as unknown as FieldPath, { merge: true })

            if (isOnWatchPage) {
                await addDoc(collection(db, 'comments', `${mediaInfo.id}`, `${episodeNumber}`), {
                    commentRef: doc(db, 'comments', `${mediaInfo.id}`, "all", commentCreatedDoc.id)
                })
            }

        }

        loadComments()

        setIsLoadingHook(false)

    }

    return (
        <div id={styles.write_comment_container}>

            <div className={styles.img_container}>

                <Image
                    src={user?.photoURL || ProfileFallbackImg}
                    alt={user?.displayName || "User Not Logged In Profile Picture"}
                    fill
                    sizes='60px'
                />

            </div>

            <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => handleCreateComment(e)}>
                <label>
                    {user ? `${isAReply ? `Reply as ${user.displayName}` : `Comment as ${user.displayName}`}` : "Please log in to comment"}
                    <textarea
                        rows={isAReply ? 2 : 3} cols={70}
                        name='comment'
                        onChange={(e) => wasCommentCreatedSuccessfully ? setWasCommentCreatedSuccessfully(false) : setCurrTextLength(e.target.value.length)}
                        placeholder={isAReply ? "Reply with..." : 'Leave a comment'}
                        required
                    ></textarea>
                </label>

                <div className={styles.flex_row_justify_between}>

                    <div id={styles.is_spoiler_checkbox_container}>

                        <label>

                            <input
                                type='checkbox'
                                name='spoiler'
                                defaultChecked={false}
                                aria-label="Spoiler Checkbox"
                            />
                            <span />

                        </label>

                        <p>SPOILER!!!</p>

                    </div>

                    <small data-over-limit={currTextLength > inputCharLimit}>
                        Chars. {currTextLength} / {inputCharLimit}
                    </small>

                </div>

                <motion.button
                    type='submit'
                    disabled={isLoadingHook || user?.isAnonymous || currTextLength > inputCharLimit}
                    whileTap={{ scale: 0.9 }}
                >
                    {wasCommentCreatedSuccessfully ?
                        <><SvgCheck width={16} height={16} alt="Check" /> Comment Done</>
                        :
                        "Comment!"
                    }
                </motion.button>
            </form>

        </div>
    )

}