import { toast } from "sonner";
import api from "@/utils/axios";

const axiosBaseQuery = async ({ url, method, data }) => {
    try {
        const response = await api({
            url,
            method,
            data
        })

        response?.data?.message && toast.success(response?.data?.message)
        return { data: response.data }
    } catch (error) {
        toast.error(error.response.data.message)
        return {
            error: {
                status: error.response?.status,
                message: error.response?.data?.message || error.message,
            }
        }
    }
}

export default axiosBaseQuery;