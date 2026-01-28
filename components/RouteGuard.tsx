'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ADMIN_BYPASS_COOKIE = 'admin_bypass';

const hasBypassCookie = () => {
	if (typeof document === 'undefined') return false;
	return document.cookie
		.split('; ')
		.find((row) => row.startsWith(`${ADMIN_BYPASS_COOKIE}=`))
		?.split('=')[1] === '1';
};

const clearBypassCookie = () => {
	if (typeof document === 'undefined') return;
	document.cookie = `${ADMIN_BYPASS_COOKIE}=; path=/; max-age=0; samesite=lax`;
};

export default function RouteGuard() {
	const { loading, isAdmin } = useAuth();
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		if (pathname.startsWith('/sunset')) return;
		if (loading) return;

		const bypass = hasBypassCookie();
		if (!isAdmin || !bypass) {
			clearBypassCookie();
			router.replace('/sunset');
		}
	}, [pathname, loading, isAdmin, router]);

	return null;
}