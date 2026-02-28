import { Platform } from 'react-native';

// Use Expo LAN IP for physical device testing, localhost for web
const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        return 'http://localhost:8000';
    }
    // Update to match the local IPv4 address you're using to run the app
    // e.g. from ipconfig - usually 192.168.1.xxx
    // Usually accessible as the HOST running the metro bundler
    return 'http://192.168.1.3:8000'; // Make sure this matches your PC's IP
};

export const API_URL = getBaseUrl();

const handleError = (data: any) => {
    let errorMsg = 'Request failed';
    if (typeof data.detail === 'string') {
        errorMsg = data.detail;
    } else if (Array.isArray(data.detail) && data.detail.length > 0) {
        // FastAPI validation errors are often a list of objects with 'msg'
        errorMsg = data.detail[0].msg || JSON.stringify(data.detail);
    } else if (data.detail) {
        errorMsg = JSON.stringify(data.detail);
    }
    throw new Error(errorMsg);
};

export const apiPost = async (endpoint: string, body: object) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) handleError(data);
    return data;
};

export const apiGet = async (endpoint: string) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) handleError(data);
    return data;
};

export const apiPut = async (endpoint: string, body: object) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) handleError(data);
    return data;
};
