import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: 'include',
    prepareHeaders: (headers) => {
      // Do not set Content-Type globally to allow FormData uploads
      return headers;
    },
  }),
  tagTypes: [
    'Auth',
    'Employee',
    'Department',
    'Line',
    'Machine',
    'Process',
    'Unit',
    'Question',
    'QuestionCategory',
    'Audit',
  ],
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation({
      query: (body) => ({ url: '/api/v1/auth/login', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation({
      query: () => ({ url: '/api/v1/auth/logout', method: 'POST' }),
      invalidatesTags: ['Auth'],
    }),
    getMe: builder.query({
      query: () => '/api/v1/auth/me',
      providesTags: ['Auth'],
    }),
    getUserStats: builder.query({
      query: () => '/api/v1/auth/user-stats',
      providesTags: ['Employee'],
    }),
    initiateQrLogin: builder.mutation({
      query: (body) => ({ url: '/api/v1/auth/qr-login/initiate', method: 'POST', body }),
    }),
    verifyQrLoginOtp: builder.mutation({
      query: (body) => ({ url: '/api/v1/auth/qr-login/verify', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),
    initiateMobileLogin: builder.mutation({
      query: (body) => ({ url: '/api/v1/auth/mobile-login/initiate', method: 'POST', body }),
    }),
    verifyMobileLoginOtp: builder.mutation({
      query: (body) => ({ url: '/api/v1/auth/mobile-login/verify', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),

    // Employees
    getEmployees: builder.query({
      query: ({ page = 1, limit = 20, search = '', unit, department } = {}) => ({
        url: '/api/v1/auth/get-employee',
        params: {
          page,
          limit,
          search,
          ...(unit ? { unit } : {}),
          ...(department ? { department } : {}),
        },
      }),
      providesTags: (result) =>
        result?.data?.employees
          ? [
            ...result.data.employees.map((e) => ({ type: 'Employee', id: e._id })),
            { type: 'Employee', id: 'LIST' },
          ]
          : [{ type: 'Employee', id: 'LIST' }],
    }),
    getAllUsers: builder.query({
      query: ({ page = 1, limit = 20, search = '', role } = {}) => ({
        url: '/api/v1/auth/get-all-users',
        params: { page, limit, search, ...(role ? { role } : {}) },
      }),
      providesTags: [{ type: 'Employee', id: 'ALL' }],
    }),

    // Lines
    getLines: builder.query({
      query: (params = {}) => ({ url: '/api/lines', params }),
      providesTags: [{ type: 'Line', id: 'LIST' }],
    }),
    createLine: builder.mutation({
      query: (body) => ({ url: '/api/lines', method: 'POST', body }),
      invalidatesTags: ['Line'],
    }),
    updateLine: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/lines/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Line'],
    }),
    deleteLine: builder.mutation({
      query: (id) => ({ url: `/api/lines/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Line'],
    }),
    reorderLines: builder.mutation({
      query: (body) => ({ url: '/api/lines/reorder', method: 'POST', body }),
      invalidatesTags: ['Line'],
    }),

    // Machines
    getMachines: builder.query({
      query: (params = {}) => ({ url: '/api/machines', params }),
      providesTags: [{ type: 'Machine', id: 'LIST' }],
    }),
    createMachine: builder.mutation({
      query: (body) => ({ url: '/api/machines', method: 'POST', body }),
      invalidatesTags: ['Machine'],
    }),
    updateMachine: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/machines/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Machine'],
    }),
    deleteMachine: builder.mutation({
      query: (id) => ({ url: `/api/machines/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Machine'],
    }),

    // Processes
    getProcesses: builder.query({
      query: () => '/api/processes',
      providesTags: [{ type: 'Process', id: 'LIST' }],
    }),
    createProcess: builder.mutation({
      query: (body) => ({ url: '/api/processes', method: 'POST', body }),
      invalidatesTags: ['Process'],
    }),
    updateProcess: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/processes/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Process'],
    }),
    deleteProcess: builder.mutation({
      query: (id) => ({ url: `/api/processes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Process'],
    }),

    // Units
    getUnits: builder.query({
      query: () => '/api/units',
      providesTags: [{ type: 'Unit', id: 'LIST' }],
    }),
    createUnit: builder.mutation({
      query: (body) => ({ url: '/api/units', method: 'POST', body }),
      invalidatesTags: ['Unit'],
    }),
    updateUnit: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/units/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Unit'],
    }),
    deleteUnit: builder.mutation({
      query: (id) => ({ url: `/api/units/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Unit'],
    }),
    reorderUnits: builder.mutation({
      query: (body) => ({ url: '/api/units/reorder', method: 'POST', body }),
      invalidatesTags: ['Unit'],
    }),

    // Questions
    getQuestions: builder.query({
      query: (params) => ({ url: '/api/questions', params }),
      providesTags: [{ type: 'Question', id: 'LIST' }],
    }),
    createQuestions: builder.mutation({
      query: (body) => ({ url: '/api/questions', method: 'POST', body }),
      invalidatesTags: ['Question'],
    }),
    updateQuestion: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/questions/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Question'],
    }),
    deleteQuestion: builder.mutation({
      query: (id) => ({ url: `/api/questions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Question'],
    }),
    deleteTemplateQuestions: builder.mutation({
      query: (templateTitle) => ({
        url: `/api/questions/template/${encodeURIComponent(templateTitle)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Question'],
    }),
    // Question categories
    getQuestionCategories: builder.query({
      query: () => ({ url: '/api/question-categories' }),
      providesTags: [{ type: 'QuestionCategory', id: 'LIST' }],
    }),
    createQuestionCategory: builder.mutation({
      query: (body) => ({ url: '/api/question-categories', method: 'POST', body }),
      invalidatesTags: ['QuestionCategory'],
    }),
    updateQuestionCategory: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/question-categories/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'QuestionCategory', id },
        { type: 'QuestionCategory', id: 'LIST' },
      ],
    }),
    deleteQuestionCategory: builder.mutation({
      query: (id) => ({ url: `/api/question-categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['QuestionCategory'],
    }),

    // Audits
    getAudits: builder.query({
      query: ({ page = 1, limit = 20, auditor, startDate, endDate, line, machine, process, unit, shift, department, result } = {}) => ({
        url: '/api/audits',
        params: { page, limit, auditor, startDate, endDate, line, machine, process, unit, shift, department, result },
      }),
      providesTags: [{ type: 'Audit', id: 'LIST' }],
    }),
    getAuditById: builder.query({
      query: (id) => `/api/audits/${id}`,
      providesTags: (result, error, id) => [{ type: 'Audit', id }],
    }),
    createAudit: builder.mutation({
      query: (body) => ({ url: '/api/audits', method: 'POST', body }),
      invalidatesTags: ['Audit'],
    }),
    updateAudit: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/audits/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Audit', id }, { type: 'Audit', id: 'LIST' }],
    }),
    deleteAudit: builder.mutation({
      query: (id) => ({ url: `/api/audits/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Audit', id: 'LIST' }],
    }),

    // Departments
    getDepartments: builder.query({
      query: ({ page = 1, limit = 20, includeInactive = false, unit } = {}) => ({
        url: '/api/v1/departments',
        params: {
          page,
          limit,
          includeInactive,
          ...(unit ? { unit } : {}),
        },
      }),
      providesTags: [{ type: 'Department', id: 'LIST' }],
    }),
    getDepartmentById: builder.query({
      query: (id) => `/api/v1/departments/${id}`,
      providesTags: (result, error, id) => [{ type: 'Department', id }],
    }),
    getDepartmentStats: builder.query({
      query: ({ unit } = {}) => ({
        url: '/api/v1/departments/stats',
        params: {
          ...(unit ? { unit } : {}),
        },
      }),
      providesTags: [{ type: 'Department', id: 'STATS' }],
    }),
    createDepartment: builder.mutation({
      query: (body) => ({ url: '/api/v1/departments', method: 'POST', body }),
      invalidatesTags: ['Department'],
    }),
    updateDepartment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/v1/departments/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Department'],
    }),
    deleteDepartment: builder.mutation({
      query: ({ id, payload }) => ({ url: `/api/v1/departments/${id}`, method: 'DELETE', body: payload }),
      invalidatesTags: ['Department'],
    }),
    assignEmployeeToDepartment: builder.mutation({
      query: (body) => ({ url: '/api/v1/departments/assign-employee', method: 'POST', body }),
      invalidatesTags: ['Department', 'Employee'],
    }),
    removeEmployeeFromDepartment: builder.mutation({
      query: (body) => ({ url: '/api/v1/departments/remove-employee', method: 'POST', body }),
      invalidatesTags: ['Department', 'Employee'],
    }),

    // Employee single
    getEmployeeById: builder.query({
      query: (id) => `/api/v1/auth/employee/${id}`,
      providesTags: (result, error, id) => [{ type: 'Employee', id }],
    }),
    updateEmployeeById: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/v1/auth/employee/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Employee', id }, { type: 'Employee', id: 'LIST' }],
    }),
    updateEmployeeTargetAudit: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/v1/auth/employee/${id}/target-audit`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Employee', id }],
    }),
    deleteEmployeeById: builder.mutation({
      query: (id) => ({ url: `/api/v1/auth/employee/${id}`, method: 'DELETE' }),
      invalidatesTags: [
        { type: 'Employee', id: 'LIST' },
        'Department',
      ],
    }),
    registerEmployee: builder.mutation({
      query: (body) => ({ url: '/api/v1/auth/register', method: 'POST', body }),
      invalidatesTags: ['Employee'],
    }),

    // Uploads
    uploadImage: builder.mutation({
      query: (file) => {
        const form = new FormData();
        form.append('photo', file);
        return { url: '/api/upload/image', method: 'POST', body: form };
      },
    }),
    deleteUpload: builder.mutation({
      query: (publicId) => ({ url: `/api/upload/${publicId}`, method: 'DELETE' }),
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useInitiateQrLoginMutation,
  useVerifyQrLoginOtpMutation,
  useInitiateMobileLoginMutation,
  useVerifyMobileLoginOtpMutation,
  useGetEmployeesQuery,
  useGetAllUsersQuery,
  useGetLinesQuery,
  useCreateLineMutation,
  useUpdateLineMutation,
  useDeleteLineMutation,
  useReorderLinesMutation,
  useGetMachinesQuery,
  useCreateMachineMutation,
  useUpdateMachineMutation,
  useDeleteMachineMutation,
  useGetProcessesQuery,
  useCreateProcessMutation,
  useUpdateProcessMutation,
  useDeleteProcessMutation,
  useGetUnitsQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
  useReorderUnitsMutation,
  useGetQuestionsQuery,
  useCreateQuestionsMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  useDeleteTemplateQuestionsMutation,
  useGetQuestionCategoriesQuery,
  useCreateQuestionCategoryMutation,
  useUpdateQuestionCategoryMutation,
  useDeleteQuestionCategoryMutation,
  useGetAuditsQuery,
  useGetAuditByIdQuery,
  useCreateAuditMutation,
  useUpdateAuditMutation,
  useDeleteAuditMutation,
  useGetDepartmentsQuery,
  useGetDepartmentByIdQuery,
  useGetDepartmentStatsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useAssignEmployeeToDepartmentMutation,
  useRemoveEmployeeFromDepartmentMutation,
  useGetEmployeeByIdQuery,
  useUpdateEmployeeByIdMutation,
  useUpdateEmployeeTargetAuditMutation,
  useDeleteEmployeeByIdMutation,
  useRegisterEmployeeMutation,
  useUploadImageMutation,
  useDeleteUploadMutation,
  useGetUserStatsQuery,
} = api;
