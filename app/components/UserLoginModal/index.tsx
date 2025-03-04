import { AnimatePresence, motion } from 'framer-motion'
import React, { MouseEventHandler, useState } from 'react'
import styles from "./component.module.css"
import GoogleSvg from '@/public/assets/google-fill.svg'
import GitHubSvg from '@/public/assets/github.svg'
import AnonymousSvg from '@/public/assets/person-fill.svg'
import CloseSvg from '@/public/assets/x.svg'
import LoadingSvg from '@/public/assets/Eclipse-1s-200px.svg'
import {
    signInWithPopup, GoogleAuthProvider,
    GithubAuthProvider, Auth, signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signInAnonymously,
    User
} from 'firebase/auth'
import { collection, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import { initFirebase } from '@/app/firebaseApp'
import ProfileFallbackImg from "@/public/profile_fallback.jpg"
import { useAuthState } from 'react-firebase-hooks/auth'
import UserSettingsModal from '@/app/components/layout/header/components/User/UserSettingsModal'

type ModalTypes = {
    onClick?: MouseEventHandler<HTMLDivElement>,
    auth: Auth
}

const framerMotionDropIn = {

    hidden: {
        x: "-100vw",
        opacity: 0
    },
    visible: {
        x: "0",
        opacity: 1,
        transition: {
            duration: 0.2,
            damping: 25,
            type: "spring",
            stiffness: 500
        }
    },
    exit: {
        x: "100vw",
        opacity: 0
    }

}

export default function UserModal({ onClick, auth, }: ModalTypes) {

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(false)

    const [formType, setFormType] = useState<"login" | "signup">("login")
    const [loginError, setLoginError] = useState<{ code: string, message: string } | null>(null)

    const googleProvider = new GoogleAuthProvider()
    const githubProvider = new GithubAuthProvider()

    const [user] = useAuthState(auth)
    const db = getFirestore(initFirebase())

    async function createNewUserDocument(user: User) {

        const doesUserHasDoc = await getDoc(doc(db, "users", user.uid)).then(res => res.data())

        if (doesUserHasDoc) return

        // if user is anonymous, set a placeholder Name and Photo
        if (user.isAnonymous) {
            await updateProfile(
                user, {
                displayName: "Anonymous",
                photoURL: "https://i.pinimg.com/736x/fc/4e/f7/fc4ef7ec7265a1ebb69b4b8d23982d9d.jpg"
            })
        }

        setIsSettingsMenuOpen(true) // requires user to custom his new profile on Settings Panel

        const defaultNewUserDocValues = {
            bookmarks: [],
            keepWatching: [],
            notifications: [],
            comments: {},
            episodesWatched: {},
            chaptersRead: {},
            videoSource: "gogoanime",
            showAdultContent: false,
            autoNextEpisode: true,
            autoSkipIntroAndOutro: false,
            videoQuality: "auto",
            videoSubtitleLanguage: "English",
        }

        await setDoc(doc(collection(db, "users"), user.uid), defaultNewUserDocValues)

    }

    const signInGoogle = async () => {
        await signInWithPopup(auth, googleProvider)
            .then(async (res) => await createNewUserDocument(res.user))
            .catch((err: any) => {

                setLoginError({
                    code: err.code,
                    message: err.message
                })

            })
    }

    const signInGithub = async () => {
        await signInWithPopup(auth, githubProvider)
            .then(async (res) => await createNewUserDocument(res.user))
            .catch((err: any) => {

                setLoginError({
                    code: err.code,
                    message: err.message
                })

            })
    }

    const signAnonymously = async () => {
        await signInAnonymously(auth)
            .then(async (res) => await createNewUserDocument(res.user))
            .catch((err: any) => {

                setLoginError({
                    code: err.code,
                    message: err.message
                })

            })
    }

    async function handleLoginForm(e: React.FormEvent<HTMLFormElement>) {

        e.preventDefault()

        setIsLoading(true)

        const form: any = e.target

        try {
            await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value.trim())
            setLoginError(null)
        }
        catch (err: any) {

            setLoginError({
                code: err.code,
                message: err.code == "auth/invalid-credential" ? "Check Your Email and Password, then try again." : err.message
            })

        }

        setIsLoading(false)

    }

    async function handleSignUpForm(e: React.FormEvent<HTMLFormElement>) {

        e.preventDefault()

        setIsLoading(true)

        const form: any = e.target

        try {

            const doesPasswordFieldsMatch = form.password.value.trim() == form.confirm_password.value.trim()

            if (!doesPasswordFieldsMatch) {
                setLoginError({
                    code: "password",
                    message: "Passwords doesn't match."
                })

                setIsLoading(false)

                return
            }

            const res = await createUserWithEmailAndPassword(auth, form.email.value.trim(), form.password.value.trim())

            // update user info
            await updateProfile(res.user, {
                displayName: form.username.value,
                photoURL: ProfileFallbackImg.src as string
            })

            // add default values to user doc
            await createNewUserDocument(res.user)

            setLoginError(null)
        }
        catch (err: any) {

            setLoginError({
                code: err.code,
                message: err.message
            })

        }

        setIsLoading(false)

    }

    // Required to customize the new User created on Settings panel
    if (user && isSettingsMenuOpen) return <UserSettingsModal auth={auth} onClick={onClick} newUser />

    return !user && (
        <motion.div
            id={styles.backdrop}
            onClick={onClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                onClick={(e) => e.stopPropagation()}
                id={styles.modal}
                variants={framerMotionDropIn}
                initial="hidden"
                animate="visible"
                exit="exit"
            >

                <div id={styles.heading}>
                    <h5>Login with</h5>
                    <button
                        aria-label='Close User Panel'
                        onClick={onClick as unknown as MouseEventHandler<HTMLButtonElement>}
                    >
                        <CloseSvg width={16} height={16} alt={"Close icon"} />
                    </button>
                </div>

                <LoginAlternativesButtons
                    withGitHub={() => signInGithub()}
                    anonymously={() => signAnonymously()}
                    withGoogle={() => signInGoogle()}
                />

                <div id={styles.span_container}>
                    <span></span>
                    <span>or</span>
                    <span></span>
                </div>

                <motion.form
                    onSubmit={(e) => formType == "signup" ? handleSignUpForm(e) : handleLoginForm(e)}
                    onChange={() => setLoginError(null)}
                    data-error-occurred={loginError ? true : false}
                >

                    <AnimatePresence>
                        {formType == "signup" && (
                            <motion.label
                                initial={{ opacity: 0, height: 0, }}
                                animate={{ opacity: 1, height: "auto", transition: { duration: 0.4 } }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                Username
                                <input
                                    type='text'
                                    name='username'
                                    pattern="^.{1,15}$"
                                    title={"The limit is 15 characters."}
                                    placeholder='Your Username'
                                    required>
                                </input>
                            </motion.label>
                        )}
                    </AnimatePresence>

                    <label>
                        Email
                        <input
                            type='email'
                            name='email'
                            placeholder='Your Email'
                            required></input>
                    </label>

                    <label>
                        Password
                        <input
                            type='password'
                            name='password'
                            pattern="^(?=.*\d)(?=.*[a-zA-Z]).{8,}$"
                            title={"Password has to have at least 1 letter and 1 number. Min. 8 characters."}
                            autoComplete={formType == "signup" ? 'new-password' : 'current-password'}
                            placeholder='Your Password'
                            required>
                        </input>
                    </label>

                    <AnimatePresence>
                        {formType == "signup" && (
                            <motion.label
                                initial={{ opacity: 0, height: 0, marginTop: "8px" }}
                                animate={{ opacity: 1, height: "auto", transition: { duration: 0.4 } }}
                                exit={{ opacity: 0, height: 0, marginTop: "0" }}
                            >
                                Confirm Password
                                <input
                                    type='password'
                                    name='confirm_password'
                                    pattern="^(?=.*\d)(?=.*[a-zA-Z]).{8,}$"
                                    title={"Password has to have at least 1 letter and 1 number. Min. 8 characters."}
                                    placeholder='Your Password Again'
                                    required>
                                </input>
                            </motion.label>
                        )}
                    </AnimatePresence>

                    <motion.button
                        type='submit'
                        whileTap={{ scale: 0.95 }}
                        disabled={isLoading}
                    >

                        <AnimatePresence>
                            {isLoading ? (
                                <LoadingSvg width={16} height={16} alt={"Loading"} />
                            ) : (
                                formType == "signup" ? (
                                    <motion.span>
                                        SIGN UP
                                    </motion.span>
                                ) : (
                                    <motion.span>
                                        LOGIN
                                    </motion.span>
                                )
                            )}
                        </AnimatePresence>
                    </motion.button>

                </motion.form>

                <AnimatePresence>
                    {loginError && (
                        <motion.p
                            style={{ color: "var(--black-100)", padding: "16px", background: "var(--black-05)" }}
                            initial={{
                                opacity: 0,
                                height: 0
                            }}
                            animate={{
                                opacity: 1,
                                height: "auto"
                            }}
                            exit={{
                                opacity: 0,
                                height: 0
                            }}
                        >
                            <span style={{ color: "var(--error)" }}>{loginError.code}:</span> {loginError.message}
                        </motion.p>
                    )}
                </AnimatePresence>

                <motion.button
                    id={styles.create_account_button}
                    onClick={() => setFormType(formType == "signup" ? "login" : "signup")}
                >
                    {formType == "signup" ? "Or Login in Your Account" : "Or Create Your Account"}
                </motion.button>

            </motion.div>
        </motion.div >

    )
}

function LoginAlternativesButtons({ withGoogle, withGitHub, anonymously }: { withGoogle: () => void, withGitHub: () => void, anonymously: () => void }) {

    return (
        <div id={styles.login_buttons_container}>
            <div>
                <button title='Google' id={styles.google_button} onClick={() => withGoogle()}>
                    <GoogleSvg width={16} height={16} alt={"Google icon"} />
                </button>
                <small>Google</small>
            </div>

            <div>
                <button title='Anonymously' id={styles.anonymous_button} onClick={() => anonymously()}>
                    <AnonymousSvg width={16} height={16} alt={"Anonymous icon"} />
                </button>
                <small>Anonymously</small>
            </div>

            <div>
                <button title='GitHub' id={styles.github_button} onClick={() => withGitHub()}>
                    <GitHubSvg width={16} height={16} alt={"GitHub icon"} />
                </button>
                <small>GitHub</small>
            </div>
        </div>
    )

}