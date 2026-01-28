'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FeedbackCard from '@/components/FeedbackCard';
import { GraduationCap, Shield, Sparkles, Sun } from 'lucide-react';

const ADMIN_SEEN_KEY = 'sunset_admin_seen';
const ADMIN_BYPASS_COOKIE = 'admin_bypass';

const setBypassCookie = () => {
	if (typeof document === 'undefined') return;
	document.cookie = `${ADMIN_BYPASS_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
};

const clearBypassCookie = () => {
	if (typeof document === 'undefined') return;
	document.cookie = `${ADMIN_BYPASS_COOKIE}=; path=/; max-age=0; samesite=lax`;
};

export default function SunsetPage() {
	const { loading, isAdmin } = useAuth();
	const router = useRouter();
	const [adminSeen, setAdminSeen] = useState(false);

	useEffect(() => {
		if (loading) return;
		if (!isAdmin) {
			clearBypassCookie();
			return;
		}

		const seen = localStorage.getItem(ADMIN_SEEN_KEY) === 'true';
		if (!seen) {
			localStorage.setItem(ADMIN_SEEN_KEY, 'true');
			setAdminSeen(false);
			return;
		}

		setAdminSeen(true);
		setBypassCookie();
		router.replace('/dashboard');
	}, [loading, isAdmin, router]);

	return (
		<div className="relative min-h-screen overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-br from-cyber-gray-50 via-white to-cyber-yellow/10" />
			<div className="absolute -top-24 right-10 w-[420px] h-[420px] bg-gradient-to-br from-cyber-yellow/30 to-cyber-yellow/5 rounded-full blur-3xl animate-pulse" />
			<div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyber-yellow/15 to-transparent rounded-full blur-3xl" />

			<div className="absolute top-16 left-10 animate-bounce animation-delay-500">
				<Sparkles className="w-5 h-5 text-cyber-yellow/60" />
			</div>
			<div className="absolute top-32 right-20 animate-bounce animation-delay-1000">
				<Sun className="w-6 h-6 text-cyber-yellow/50" />
			</div>

			<div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
				<div className="w-full max-w-4xl text-center">
					<div className="flex items-center justify-center mb-6">
						<div className="relative">
							<div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-cyber-yellow to-cyber-yellow-dark rounded-3xl flex items-center justify-center shadow-2xl shadow-cyber-yellow/30">
								<GraduationCap className="w-10 h-10 md:w-12 md:h-12 text-cyber-gray-900" />
							</div>
							<div className="absolute -bottom-2 -right-2 w-8 h-8 bg-cyber-yellow rounded-full flex items-center justify-center">
								<Sun className="w-4 h-4 text-cyber-gray-900" />
							</div>
						</div>
					</div>

					<h1 className="text-4xl md:text-6xl font-bold mb-4">
						<span className="bg-gradient-to-r from-cyber-gray-900 via-cyber-gray-700 to-cyber-gray-900 bg-clip-text text-transparent">
							FET Attendance Portal
						</span>
						<br />
						<span className="bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark bg-clip-text text-transparent">
							is now sunset
						</span>
					</h1>

					<p className="text-sm md:text-xl text-cyber-gray-600 max-w-2xl mx-auto leading-relaxed">
						This system has gracefully completed its journey. For reports, records, or any official requests, please contact <span className="font-semibold text-cyber-gray-900">Vishal sir</span>.
					</p>

					<div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
						<Card variant="cyber" className="p-4 md:p-6 text-left">
							<div className="flex items-center gap-3 mb-2">
								<Shield className="w-5 h-5 text-cyber-yellow" />
								<h3 className="font-semibold text-cyber-gray-900">Finalized & Secure</h3>
							</div>
							<p className="text-sm text-cyber-gray-600">All attendance records are locked and preserved.</p>
						</Card>
						<Card variant="cyber" className="p-4 md:p-6 text-left">
							<div className="flex items-center gap-3 mb-2">
								<Sun className="w-5 h-5 text-cyber-yellow" />
								<h3 className="font-semibold text-cyber-gray-900">Sunset Mode</h3>
							</div>
							<p className="text-sm text-cyber-gray-600">The portal is now in archival, view-only status.</p>
						</Card>
						<Card variant="cyber" className="p-4 md:p-6 text-left">
							<div className="flex items-center gap-3 mb-2">
								<Sparkles className="w-5 h-5 text-cyber-yellow" />
								<h3 className="font-semibold text-cyber-gray-900">Need Help?</h3>
							</div>
							<p className="text-sm text-cyber-gray-600">Reach out to Vishal sir for any admin support.</p>
						</Card>
					</div>

					{isAdmin && adminSeen && (
						<div className="mt-6 flex justify-center">
							<Button
								onClick={() => {
									setBypassCookie();
									router.push('/dashboard');
								}}
								className="bg-cyber-yellow hover:bg-cyber-yellow-dark text-cyber-gray-900"
							>
								Continue to Admin Portal
							</Button>
						</div>
					)}

					<div className="mt-10 md:mt-14 flex justify-center">
						<div className="w-full max-w-xl opacity-90">
							<FeedbackCard />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}