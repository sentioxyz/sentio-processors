import axios from "axios"

const axiosInst = axios.create();
axiosInst.defaults.timeout = 30000 // time out

axiosInst.interceptors.request.use(config => {
    config.headers["key"] = "SGFlZGFsJTIwZmluYW5jZQ==";

    return config;
}, err => {
    console.log(err);
    return Promise.reject(err);
});

export default axiosInst
