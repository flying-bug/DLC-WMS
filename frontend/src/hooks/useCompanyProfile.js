import { useEffect, useSyncExternalStore } from 'react';
import axiosClient from '../api/axiosClient';
import { getCompanyProfile, setCompanyProfile, subscribeCompanyProfile } from '../utils/companyProfile';

let profileRequest = null;
let brandingRequest = null;

/** Tải thông tin doanh nghiệp (cần đăng nhập). Gọi nhiều lần chỉ tải một lần; force để tải lại sau khi lưu thiết lập. */
export function loadCompanyProfile({ force = false } = {}) {
    if (profileRequest && !force) return profileRequest;
    profileRequest = axiosClient.get('/business-settings/company')
        .then((res) => setCompanyProfile(res.data?.data ?? res.data))
        .catch(() => {
            profileRequest = null;
            return getCompanyProfile();
        });
    return profileRequest;
}

/** Màn đăng nhập / quên mật khẩu: chỉ lấy tên hiển thị (API không cần đăng nhập). */
export function loadCompanyBranding() {
    if (brandingRequest) return brandingRequest;
    brandingRequest = axiosClient.get('/business-settings/branding')
        .then((res) => {
            const data = res.data?.data ?? res.data ?? {};
            return setCompanyProfile({
                ...getCompanyProfile(),
                ...(data.name ? { name: data.name } : {}),
                ...(data.shortName ? { shortName: data.shortName } : {}),
            });
        })
        .catch(() => {
            brandingRequest = null;
            return getCompanyProfile();
        });
    return brandingRequest;
}

/**
 * Thông tin doanh nghiệp cho giao diện; tự tải lần đầu. publicOnly dùng cho màn chưa đăng nhập (chỉ lấy tên hiển thị).
 */
export function useCompanyProfile({ publicOnly = false } = {}) {
    const profile = useSyncExternalStore(subscribeCompanyProfile, getCompanyProfile);
    useEffect(() => {
        if (publicOnly) loadCompanyBranding();
        else loadCompanyProfile();
    }, [publicOnly]);
    return profile;
}
