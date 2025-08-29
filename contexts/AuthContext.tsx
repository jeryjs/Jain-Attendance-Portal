'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { User as AppUser } from '@/lib/types';

interface AuthContextType {
	user: AppUser | null;
	loading: boolean;
	signIn: () => Promise<void>;
	logout: () => Promise<void>;
	isTeacher: boolean;
	isAdmin: boolean;
	isStudent: boolean;
	recentSections: string[];
	setRecentSections: React.Dispatch<React.SetStateAction<string[]>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AppUser | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				// Get custom claims from the user
				let idTokenResult = await firebaseUser.getIdTokenResult();
				let customClaims = idTokenResult.claims;

				// If no custom claim for role, set one based on email
				if (!customClaims?.role) {
					const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.toLowerCase().trim()) || [];

					let role: 'student' | 'teacher' | 'admin' = 'student';
					const email = firebaseUser.email || '';
					if (/^[a-zA-Z]+\.[a-zA-Z]+@jainuniversity\.ac\.in$/.test(email)) {
						role = 'teacher';
					} else if (ADMIN_EMAILS.includes(email.toLowerCase())) {
						role = 'admin';
					} else if (/^\d{2}[a-zA-Z]{5}\d{3}@jainuniversity\.ac\.in$/.test(email)) {
						role = 'student';
					}

					// Set the custom claim via backend API (not possible directly from client)
					// You should call your backend endpoint to set the claim here
					// await fetch('/api/setCustomClaim', { method: 'POST', body: JSON.stringify({ uid: firebaseUser.uid, role }) });

					// For now, just use the detected role locally
					customClaims = { ...customClaims, role };
				}

				const appUser: AppUser = {
					uid: firebaseUser.uid,
					email: firebaseUser.email!,
					displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
					picture: customClaims?.picture as string || firebaseUser.photoURL || '',
					role: (customClaims?.role as 'student' | 'teacher' | 'admin') || 'student',
					customClaims: customClaims as any,
				};

				setUser(appUser);
			} else {
				setUser(null);
			}
			setLoading(false);
		});

		return () => unsubscribe();
	}, []);

	const signIn = async () => {
		try {
			await signInWithPopup(auth, googleProvider);
		} catch (error) {
			console.error('Error signing in:', error);
			throw error;
		}
	};

	const logout = async () => {
		try {
			await signOut(auth);
		} catch (error) {
			console.error('Error signing out:', error);
			throw error;
		}
	};

	const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
	const isAdmin = user?.role === 'admin';
	const isStudent = user?.role === 'student';

	const [recentSections, setRecentSections] = useState<string[]>(() => {
		if (typeof window !== 'undefined') {
			const recent = localStorage.getItem(`recent_sections`);
			return recent ? JSON.parse(recent) : [];
		}
		return [];
	});
	useEffect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem('recent_sections', JSON.stringify(recentSections));
		}
	}, [recentSections]);

	return (
		<AuthContext.Provider value={{
			user,
			loading,
			signIn,
			logout,
			isTeacher,
			isAdmin,
			isStudent,
			recentSections,
			setRecentSections,
		}}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}