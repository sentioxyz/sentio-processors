import axios from "axios"

// @ts-expect-error ??
const axiosInst = axios.create();
axiosInst.defaults.timeout = 30000 // time out

axiosInst.interceptors.request.use((config: any) => {
    config.headers["key"] = "SGFlZGFsJTIwZmluYW5jZQ==";

    return config;
}, (err: any) => {
    console.log(err);
    return Promise.reject(err);
});

export default axiosInst
