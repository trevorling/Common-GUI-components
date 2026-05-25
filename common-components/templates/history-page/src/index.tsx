import {FC, PropsWithChildren, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useMutation} from '@tanstack/react-query';
import {ColumnPinningState, createColumnHelper, PaginationState, SortingState,} from '@tanstack/react-table';
import {endOfDay, format, formatISO, startOfDay} from "date-fns";
import {AxiosError} from 'axios';
import './History.scss';
import {MdOutlineRemoveRedEye } from 'react-icons/md';
import {CgSpinner} from 'react-icons/cg';

import {
    Button,
    Card,
    ClearFiltersButton,
    DataTable,
    Dialog,
    Drawer,
    FormCheckbox,
    FormDatepicker,
    FormInput,
    FormMultiselect,
    HistoricalChat,
    Icon,
    Tooltip,
    Track,
} from '../../../ui-components';

import {Chat as ChatType, CHAT_EVENTS, CHAT_STATUS} from '../../../types/chat';
import {apiDev, apiDevEnded} from '../../../services';
import {Controller, useForm} from 'react-hook-form';
import {useLocation, useSearchParams} from 'react-router-dom';
import {unifyDateFromat} from './unfiyDate';
import {et} from 'date-fns/locale';
import {useDebouncedCallback} from 'use-debounce';
import {UserInfo} from "../../../types/userInfo";
import {ToastContextType} from "../../../context";

import {getDomainsArray} from "../../../utils/multiDomain-utils";
import {StoreState} from "../../../store";
import {saveFile} from "../../../services/file";

type HistoryProps = {
    user: UserInfo | null;
    userDomains: StoreState;
    toastContext: ToastContextType | null;
    onMessageClick?: (message: any) => void;
    showComment?: boolean;
    showDownload?: boolean;
    showEmail?: boolean;
    showSortingLabel?: boolean;
    showStatus?: boolean;
    displayTitle?: boolean;
    displaySearchBar?: boolean;
    displayDateFilter?: boolean;
    delegatedStartDate?: string;
    delegatedEndDate?: string;
}

type ExportResult = {
    headers: string[];
    rows: (string | number | null)[][];
    chatIds: string[];
};

const ALL_COLUMNS_VALUE = '__all__';

const ChatHistory: FC<PropsWithChildren<HistoryProps>> = ({
                                                              user,
                                                              userDomains,
                                                              toastContext,
                                                              onMessageClick,
                                                              showComment = true,
                                                              showDownload = false,
                                                              showEmail = false,
                                                              showSortingLabel = false,
                                                              showStatus = true,
                                                              displayTitle = true,
                                                              displayDateFilter = true,
                                                              displaySearchBar = true,
                                                              delegatedEndDate = null,
                                                              delegatedStartDate = null
                                                          }) => {
    const {t, i18n} = useTranslation();
    const toast = toastContext;
    const userInfo = user;
    const routerLocation = useLocation();
    const params = new URLSearchParams(routerLocation.search);
    let passedChatId = new URLSearchParams(routerLocation.search).get('chat');
    const passedStartDate = delegatedStartDate ?? params.get("start");
    const passedEndDate = delegatedEndDate ?? params.get("end");
    const skipNextSelectedColumnsEffect = useRef(false);
    const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [statusChangeModal, setStatusChangeModal] = useState<string | null>(
        null
    );
    const [chatState, setChatState] = useState<string | null>(statusChangeModal);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: searchParams.get('page')
            ? parseInt(searchParams.get('page') as string) - 1
            : 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const columnPinning: ColumnPinningState = {
        left: [],
        right: ['detail'],
    };
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [initialLoad, setInitialLoad] = useState<boolean>(true);
    const [filteredEndedChatsList, setFilteredEndedChatsList] = useState<
        ChatType[]
    >([]);

    const [messagesTrigger, setMessagesTrigger] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [counterKey, setCounterKey] = useState<number>(0)

    const useStore = userDomains;
    const [updateKey, setUpdateKey] = useState<number>(0)
    const currentDomains = useStore.getState().userDomains;
    const multiDomainEnabled = import.meta.env.REACT_APP_ENABLE_MULTI_DOMAIN?.toLowerCase() === 'true';
    const testMessageEnabled = import.meta.env.REACT_APP_SHOW_TEST_MESSAGE?.toLowerCase() === 'true';
    const envVal = import.meta.env.REACT_APP_SHOW_TEST_CONVERSATIONS;
    const showTest = envVal === undefined ? true : envVal.toLowerCase() === 'true';
    const [loading, setLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const timeoutAbortRef = useRef(false);

    const parseDateParam = (dateString: string | null) => {
      if (!dateString) return new Date();
      return new Date(dateString.split("+")[0]);
    };

    const { control, setValue, watch } = useForm<{
      startDate: Date | string;
      endDate: Date | string;
      search: string;
    }>({
      defaultValues: {
        startDate: passedStartDate ? parseDateParam(passedStartDate) : startOfDay(new Date()),
        endDate: passedEndDate ? parseDateParam(passedEndDate) : endOfDay(new Date()),
        search: '',
      },
    });

    const search = watch('search');
    const startDate = watch('startDate');
    const endDate = watch('endDate');

    const debouncedGetAllEnded = useDebouncedCallback((search) => {
        getAllEndedChats.mutate({
            startDate: formatISO(startOfDay(new Date(startDate))),
            endDate: formatISO(endOfDay(new Date(endDate))),
            pagination,
            sorting,
            search,
        });
    }, 500);

    useEffect(() => {
        if (!multiDomainEnabled) return;

        const unsubscribe = useStore.subscribe((state, prevState) => {
            if (
                JSON.stringify(state.userDomains) !==
                JSON.stringify(prevState.userDomains)
            ) {
                setUpdateKey((v) => v + 1);
            }
        });

        return () => unsubscribe();
    }, [multiDomainEnabled, useStore]);

    useEffect(() => {
        if (passedChatId != null) {
            getChatById.mutate();
            passedChatId = null;
        }
    }, [passedChatId]);

    useEffect(() => {
        const hasStart = delegatedStartDate !== null && delegatedStartDate !== undefined;
        const hasEnd = delegatedEndDate !== null && delegatedEndDate !== undefined;

        if (hasStart || hasEnd) {
            if (hasStart) {
                setValue('startDate', unifyDateFromat(delegatedStartDate));
            }
            if (hasEnd) {
                setValue('endDate', unifyDateFromat(delegatedEndDate));
            }

            if (initialLoad) {
                fetchData()
            } else {
                getAllEndedChats.mutate({
                    startDate: hasStart ? unifyDateFromat(delegatedStartDate) : formatISO(startOfDay(new Date(startDate))),
                    endDate: hasEnd ? unifyDateFromat(delegatedEndDate) : formatISO(endOfDay(new Date(endDate))),
                    pagination,
                    sorting,
                    search,
                });
            }
        }
    }, [delegatedStartDate, delegatedEndDate, updateKey]);


    const fetchData = async () => {
        setInitialLoad(false);
        try {
            const response = await apiDev.get('/accounts/get-page-preference', {
                params: {
                    user_id: userInfo?.idCode,
                    page_name: window.location.pathname,
                },
            });

            if (response.data) {
                const currentColumns = response.data.selectedColumns;
                const newPageResults = response.data.pageResults !== undefined ? response.data.pageResults : 10;
                const updatedPagination = updatePagePreference(newPageResults);

                let newSelectedColumns = [];
                if (currentColumns?.length > 0 && currentColumns[0] !== "") {
                    newSelectedColumns = currentColumns;
                }

                skipNextSelectedColumnsEffect.current = true;
                setSelectedColumns(getUiSelectedColumns(newSelectedColumns));
                setCounterKey(prev => prev + 1);

                getAllEndedChats.mutate({
                    startDate: formatISO(startOfDay(new Date(startDate))),
                    endDate: formatISO(endOfDay(new Date(endDate))),
                    pagination: updatedPagination,
                    sorting,
                    search,
                });
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        }
    };

    const updatePagePreference = (pageResults: number): PaginationState => {
        const updatedPagination: PaginationState = {
            ...pagination,
            pageSize: pageResults,
        };
        setPagination(updatedPagination);
        return updatedPagination;
    };

    useEffect(() => {
        if (initialLoad) {
            fetchData();
        } else if (skipNextSelectedColumnsEffect.current) {
            skipNextSelectedColumnsEffect.current = false;
        } else {
            getAllEndedChats.mutate({
                startDate: formatISO(startOfDay(new Date(startDate))),
                endDate: formatISO(endOfDay(new Date(endDate))),
                pagination,
                sorting,
                search,
            });
        }
    }, [selectedColumns, currentDomains]);

    const updatePagePreferences = useMutation({
        mutationFn: (data: {
            page_results: number;
            selected_columns: string[];
        }) => {
            return apiDev.post('accounts/update-page-preference', {
                user_id: userInfo?.idCode,
                page_name: window.location.pathname,
                page_results: data.page_results,
                selected_columns: `{"${data.selected_columns.join('","')}"}`
            });
        },
    });

    const getAllEndedChats = useMutation({
        mutationFn: (data: {
            startDate: string;
            endDate: string;
            pagination: PaginationState;
            sorting: SortingState;
            search: string;
        }) => {
            abortRef.current?.abort();
            abortRef.current = new AbortController();

            let sortBy = 'created desc';
            if (sorting.length > 0) {
                const sortType = sorting[0].desc ? 'desc' : 'asc';
                sortBy = `${sorting[0].id} ${sortType}`;
            }

            return apiDevEnded.post('agents/chats/ended', {
                startDate: formatISO(startOfDay(new Date(data.startDate))),
                endDate: formatISO(endOfDay(new Date(data.endDate))),
                urls: getDomainsArray(currentDomains),
                showTest: showTest,
                page: data.pagination.pageIndex + 1,
                page_size: data.pagination.pageSize,
                sorting: sortBy,
                search,
            },
                {
                    signal: abortRef.current.signal
                }
            );
        },
        onSuccess: (res: any) => {
            if (selectedChat)
                setSelectedChat({
                    ...selectedChat,
                    lastMessageEvent: res.data.response[0].lastMessageEvent,
                    lastMessageTimestamp: res.data.response[0].lastMessageTimestamp,
                    userDisplayName: res.data.response[0].userDisplayName,
                });
            filterChatsList(res.data.response ?? []);
            setTotalPages(res?.data?.response[0]?.totalPages ?? 1);
            setTotalCount(res?.data?.response[0]?.totalCount ?? null);
        },
        onError: (error: AxiosError) => {
            if (error.code === 'ERR_CANCELED' && !timeoutAbortRef.current) return;
            timeoutAbortRef.current = false;
            toast?.open({
                type: 'error',
                title: t('global.notificationError'),
                message: 'Veateade',
            });
        },
    });

    useEffect(() => {
        if (getAllEndedChats.isPending) {
            loadingTimeoutRef.current = setTimeout(() => {
                timeoutAbortRef.current = true;
                abortRef.current?.abort();
            }, 10000);
        } else if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
            }
        return () => {
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        };
    }, [getAllEndedChats.isPending]);

    const getChatById = useMutation({
        mutationFn: () =>
            apiDev.post('chats/get', {
                chatId: passedChatId,
            }),
        onSuccess: (res: any) => {
            setSelectedChat(res.data.response);
            setChatState(res.data.response);
        },
    });

    const realColumnOptions: {readonly label: string; readonly value: string}[] = useMemo(() => {
        const columns = [
            {label: t('chat.history.startTime'), value: 'created'},
            {label: t('chat.history.endTime'), value: 'ended'},
            {label: t('chat.history.csaName'), value: 'customerSupportFullName'},
            {label: t('chat.history.authenticatedPerson'), value: 'authenticatedPerson'},
            {label: t('chat.history.comment'), value: 'comment'},
            {label: t('chat.history.rating'), value: 'feedbackRating'},
            {label: t('chat.history.feedback'), value: 'feedbackText'},
            {label: t('global.status'), value: 'status'},
            {label: 'ID', value: 'id'},
            {label: 'www', value: 'www'},
        ];

        if (showEmail) {
            columns.splice(4, 0, {label: t('global.email'), value: 'endUserEmail'});
        }

        if (testMessageEnabled) {
            columns.splice(5, 0, {label: t('global.test'), value: 'istest'});
        }

        columns.splice(5, 0, {label: t('global.preserve'), value: 'isPreserve'});

        return columns;
    }, [t, showEmail, testMessageEnabled])

    const visibleColumnOptions = useMemo(() => [
        {label: t('chat.history.chooseAll'), value: ALL_COLUMNS_VALUE},
        ...realColumnOptions,
    ], [t, realColumnOptions]);

    const getRealSelectedColumns = (columns: string[]) =>
        columns.filter((column) => column !== ALL_COLUMNS_VALUE);

    const getAllColumnValues = () => realColumnOptions.map((option) => option.value);

    const areAllColumnsSelected = (columns: string[]) => {
        const realSelectedColumns = getRealSelectedColumns(columns);
        const allColumnValues = getAllColumnValues();

        return allColumnValues.length > 0 &&
            allColumnValues.every((column) => realSelectedColumns.includes(column));
    };

    const getUiSelectedColumns = (columns: string[]) => {
        const realSelectedColumns = getRealSelectedColumns(columns);

        if (areAllColumnsSelected(realSelectedColumns)) {
            return [ALL_COLUMNS_VALUE, ...getAllColumnValues()];
        }

        return realSelectedColumns;
    };

    const normalizeSelectedColumns = (selection: string[]) => {
        const currentAllSelected = selectedColumns.includes(ALL_COLUMNS_VALUE) || areAllColumnsSelected(selectedColumns);
        const nextAllSelected = selection.includes(ALL_COLUMNS_VALUE);

        if (nextAllSelected && !currentAllSelected) {
            return [ALL_COLUMNS_VALUE, ...getAllColumnValues()];
        }

        if (!nextAllSelected && currentAllSelected) {
            return [];
        }

        return getUiSelectedColumns(selection);
    };

    const chatStatusChangeMutation = useMutation({
        mutationFn: async (data: { chatId: string | number; event: string }) => {
            const changeableTo = [
                CHAT_EVENTS.CLIENT_LEFT_WITH_ACCEPTED.toUpperCase(),
                CHAT_EVENTS.CLIENT_LEFT_WITH_NO_RESOLUTION.toUpperCase(),
                CHAT_EVENTS.ACCEPTED.toUpperCase(),
                CHAT_EVENTS.ANSWERED.toUpperCase(),
                CHAT_EVENTS.CLIENT_LEFT_FOR_UNKNOWN_REASONS.toUpperCase(),
                CHAT_EVENTS.CLIENT_LEFT.toUpperCase(),
                CHAT_EVENTS.HATE_SPEECH.toUpperCase(),
                CHAT_EVENTS.OTHER.toUpperCase(),
                CHAT_EVENTS.TERMINATED.toUpperCase(),
                CHAT_EVENTS.RESPONSE_SENT_TO_CLIENT_EMAIL.toUpperCase(),
            ];
            const isChangeable = changeableTo.includes(data.event);

            if (selectedChat?.lastMessageEvent === data.event.toLowerCase()) return;

            if (!isChangeable) return;

            await apiDev.post('chats/status', {
                chatId: selectedChat!.id,
                event: data.event.toUpperCase(),
                authorTimestamp: new Date().toISOString(),
                authorFirstName: userInfo!.firstName,
                authorId: userInfo!.idCode,
                authorRole: userInfo!.authorities,
            });
        },
        onSuccess: () => {
            setMessagesTrigger(!messagesTrigger);
            getAllEndedChats.mutate({
                startDate: formatISO(startOfDay(new Date(startDate))),
                endDate: formatISO(endOfDay(new Date(endDate))),
                pagination,
                sorting,
                search,
            });
            toast?.open({
                type: 'success',
                title: t('global.notification'),
                message: t('toast.success.chatStatusChanged'),
            });
            setStatusChangeModal(null);
        },
        onError: (error: AxiosError) => {
            toast?.open({
                type: 'error',
                title: t('global.notificationError'),
                message: error.message,
            });
        },
        onSettled: () => setStatusChangeModal(null),
    });

    const chatCommentChangeMutation = useMutation({
        mutationFn: (data: {
            chatId: string | number;
            comment: string;
            authorDisplayName: string;
        }) => apiDev.post('comments/history', data),
        onSuccess: (res, {chatId, comment}) => {
            const updatedChatList = filteredEndedChatsList.map((chat) =>
                chat.id === chatId ? {...chat, comment} : chat
            );
            filterChatsList(updatedChatList);
            if (selectedChat)
                setSelectedChat({
                    ...selectedChat,
                    comment,
                    commentAddedDate: res.data.response[0].created,
                    commentAuthor: res.data.response[0].authorDisplayName,
                });
            toast?.open({
                type: 'success',
                title: t('global.notification'),
                message: t('toast.success.chatCommentChanged'),
            });
        },
        onError: (error: AxiosError) => {
            toast?.open({
                type: 'error',
                title: t('global.notificationError'),
                message: error.message,
            });
        },
    });

    const chatTestChangeMutation = useMutation({
        mutationFn: (data: {
            chatId: string | number;
            isTest: boolean;
        }) => apiDev.post('chats/mark-test', data),
        onSuccess: (res, {chatId, isTest}) => {
            const updatedChatList = filteredEndedChatsList.map((chat) =>
                chat.id === chatId ? {...chat, isTest} : chat
            );
            filterChatsList(updatedChatList);
            toast?.open({
                type: 'success',
                title: t('global.notification'),
                message: t('toast.success.updateSuccess'),
            });
        },
        onError: (error: AxiosError) => {
            toast?.open({
                type: 'error',
                title: t('global.notificationError'),
                message: error.message,
            });
        },
    });

    const chatPreserveChangeMutation = useMutation({
        mutationFn: (data: {
            chatId: string | number;
            isPreserve: boolean;
        }) => apiDev.post('chats/mark-preserve', data),
        onSuccess: (res, {chatId, isPreserve}) => {
            const updatedChatList = filteredEndedChatsList.map((chat) =>
                chat.id === chatId ? {...chat, isPreserve: isPreserve} : chat
            );
            filterChatsList(updatedChatList);
            toast?.open({
                type: 'success',
                title: t('global.notification'),
                message: t('toast.success.updateSuccess'),
            });
        },
        onError: (error: AxiosError) => {
            toast?.open({
                type: 'error',
                title: t('global.notificationError'),
                message: error.message,
            });
        },
    });

    const columnHelper = createColumnHelper<ChatType>();

    const copyValueToClipboard = async (value: string) => {
        await navigator.clipboard.writeText(value);

        toast?.open({
            type: 'success',
            title: t('global.notification'),
            message: t('toast.success.copied'),
        });
    };

    const commentView = (props: any) =>
        props.getValue() && (
            <Tooltip content={props.getValue()}>
        <span
            onClick={() => copyValueToClipboard(props.getValue())}
            style={{cursor: 'pointer'}}
        >
          {props.getValue().length <= 25
              ? props.getValue()
              : `${props.getValue()?.slice(0, 25)}...`}
        </span>
            </Tooltip>
        );

    const feedbackTextView = (props: any) => {
        const value = props.getValue() ?? '';

        return (
            <Tooltip content={value}>
        <span style={{minWidth: '250px'}}>
          {value.length < 30 ? value : `${value?.slice?.(0, 30)}...`}
        </span>
            </Tooltip>
        );
    };

    const wwwView = (props: any) => (
        <Tooltip content={props.getValue() ?? ''}>
            <button
                onClick={() => copyValueToClipboard(props.getValue())}
                style={{cursor: 'pointer'}}
            >
                {props.getValue() ?? ''}
            </button>
        </Tooltip>
    );

    const statusView = (props: any) => {
        const isLastMessageEvent =
            props.row.original.lastMessageEvent != null &&
            props.row.original.lastMessageEvent !== 'message-read'
                ? t('chat.plainEvents.' + props.row.original.lastMessageEvent)
                : t('chat.status.ended');
        return props.getValue() === CHAT_STATUS.ENDED ? isLastMessageEvent : '';
    };

    const idView = (props: any) => (
        <Tooltip content={props.getValue()}>
      <span
          onClick={() => copyValueToClipboard(props.getValue())}
          style={{cursor: 'pointer'}}
      >
        {props.getValue().split('-')[0]}
      </span>
        </Tooltip>
    );

    const updateChatTest = function (chatId: string, isTest: boolean) {
      setFilteredEndedChatsList((prevChats) =>
        prevChats.map((chat) => (chat.id === chatId ? ({ ...chat, istest: isTest } as ChatType) : chat))
      );

      if (selectedChat && selectedChat.id === chatId) {
        setSelectedChat({
          ...selectedChat,
          istest: isTest,
        } as ChatType);
      }
    };

    const updateChatPreserve = function (chatId: string, isPreserve: boolean) {
      setFilteredEndedChatsList((prevChats) =>
        prevChats.map((chat) => (chat.id === chatId ? ({ ...chat, isPreserve: isPreserve } as ChatType) : chat))
      );

      if (selectedChat?.id === chatId) {
        setSelectedChat({
          ...selectedChat,
          isPreserve: isPreserve,
        } as ChatType);
      }
    };

    const markConversationAsTest = (props: any) => {
      const chatId = props.row.original.id;
      const newIsTestValue = props.getValue();
      return (
        <FormCheckbox
          checked={newIsTestValue}
          label={""}
          hideLabel
          emptyItem={true}
          name="active"
          item={{
            label: "",
            value: "active",
          }}
          onChange={(e) => {
            const isTest = e.target.checked;
            updateChatTest(chatId, isTest);
            chatTestChangeMutation.mutate({ chatId, isTest });
          }}
        />
      );
    };

    const markConversationAsPreserve = (props: any) => {
      const chatId = props.row.original.id;
      const newIsPreserveValue = props.getValue();
      return (
        <FormCheckbox
          checked={newIsPreserveValue}
          label={""}
          hideLabel
          emptyItem={true}
          name="active"
          item={{
            label: "",
            value: "active",
          }}
          onChange={(e) => {
            const isPreserve = e.target.checked;
            updateChatPreserve(chatId, isPreserve);
            chatPreserveChangeMutation.mutate({ chatId, isPreserve });
          }}
        />
      );
    };

    const detailsView = (props: any) => (
        <Button
            appearance="text"
            onClick={() => {
                setSelectedChat(props.row.original);
                setSearchParams((params) => {
                    params.set("chat", props.row.original.id);
                    return params;
                });
                setChatState(props.row.original.lastMessageEvent);
            }}
        >
            <Icon icon={<MdOutlineRemoveRedEye color={'rgba(0,0,0,0.54)'}/>}/>
            {t('global.view')}
        </Button>
    );

    const endedChatsColumns = useMemo(() => {
        const columns = [
            columnHelper.accessor('created', {
                id: 'created',
                header: t('chat.history.startTime') ?? '',
                cell: (props) =>
                    format(
                        new Date(props.getValue()),
                        'dd.MM.yyyy HH:mm:ss',
                        i18n.language === 'et' ? {locale: et} : undefined
                    ),
            }),
            columnHelper.accessor('ended', {
                id: 'ended',
                header: t('chat.history.endTime') ?? '',
                cell: (props) =>
                    format(
                        new Date(props.getValue()),
                        'dd.MM.yyyy HH:mm:ss',
                        i18n.language === 'et' ? {locale: et} : undefined
                    ),
            }),
            columnHelper.accessor(
                (row) => {
                    if (Array.isArray(row.allCsa) && !(row.allCsa.length === 1 && (row.allCsa[0] == null || row.allCsa[0].toString().trim() === ''))) {
                        const cleanedNames = row.allCsa
                            .filter(name => !!name && typeof name === 'string')
                            .map(name => name.trim())
                            .filter(name => name !== "")
                            .filter((name, index, self) => self.indexOf(name) === index);

                        const filteredNames = cleanedNames.length > 1
                            ? cleanedNames.filter(name => name !== "Bürokratt")
                            : cleanedNames;

                        return filteredNames.join(", ");
                    } else {
                        return "Bürokratt";
                    }
                },
                {
                    id: `customerSupportFullName`,
                    header: t('chat.history.csaName') ?? '',
                }
            ),
            columnHelper.accessor(
                (row) => {
                    const hasData = row.endUserFirstName || row.endUserLastName || row.endUserId || row.contactsMessage;
                    return hasData ? t('global.yes') : '';
                },
                {
                    id: 'authenticatedPerson',
                    header: t('chat.history.authenticatedPerson') ?? '',
                }
            ),
            columnHelper.accessor('comment', {
                id: 'comment',
                header: t('chat.history.comment') ?? '',
                cell: commentView,
            }),
            columnHelper.accessor('feedbackRating', {
                id: 'feedbackRating',
                header: t('chat.history.rating') ?? '',
                cell: (props) => {
                    const value = props.getValue();
                    return value !== null && value !== undefined ? <span>{`${value}/${props.row.original?.isFiveRatingScale === 'true' ? 5 : 10}`}</span> : null;
                }
            }),
            columnHelper.accessor('feedbackText', {
                id: 'feedbackText',
                header: t('chat.history.feedback') ?? '',
                cell: feedbackTextView,
            }),
            columnHelper.accessor('status', {
                id: 'status',
                header: t('global.status') ?? '',
                cell: statusView,
                sortingFn: (a, b, isAsc) => {
                    const statusA =
                        a.getValue('status') === CHAT_STATUS.ENDED
                            ? t('chat.plainEvents.' + (a.original.lastMessageEvent ?? ''))
                            : '';
                    const statusB =
                        b.getValue('status') === CHAT_STATUS.ENDED
                            ? t('chat.plainEvents.' + (b.original.lastMessageEvent ?? ''))
                            : '';
                    return (
                        statusA.localeCompare(statusB, undefined, {
                            numeric: true,
                            sensitivity: 'base',
                        }) * (isAsc ? 1 : -1)
                    );
                },
            }),
            columnHelper.accessor('id', {
                id: 'id',
                header: 'ID',
                cell: idView,
            }),
            columnHelper.accessor('endUserUrl', {
                id: 'www',
                header: 'www',
                cell: wwwView,
            }),
            columnHelper.display({
                id: 'detail',
                cell: detailsView,
                meta: {
                    size: '3%',
                    sticky: 'right',
                },
            }),
        ];

        if (showEmail) {
            columns.splice(4, 0, columnHelper.accessor('endUserEmail', {
                id: 'endUserEmail',
                header: t('global.email') ?? '',
            }));
        }

        if (testMessageEnabled) {
            columns.splice(4, 0, columnHelper.accessor('istest', {
                id: 'istest',
                header: t('global.test') ?? '',
                cell: markConversationAsTest
            }));
        }

        columns.splice(4, 0, columnHelper.accessor('isPreserve', {
            id: 'isPreserve',
            header: t('global.preserve') ?? '',
            cell: markConversationAsPreserve
        }));

        return columns;
    }, [t, showEmail, testMessageEnabled])

    const getSortingString = () => {
        if (sorting && sorting.length > 0) {
            const sortingObject = sorting[0];
            const sortingString = t('sorting.sorting');
            const orderingString = t(`sorting.${sortingObject.desc ? 'desc' : 'asc'}`);
            const column = getColumnTranslation(sortingObject.id);
            return sortingString + ' ' + column + ' ' + orderingString;
        } else {
            return '';
        }
    }

    const getColumnTranslation = (column: string): string => {
        switch (column) {
            case 'endUserId':
                return t('global.idCode') ?? ''
            case 'created':
                return t('chat.history.startTime') ?? ''
            case 'ended':
                return t('chat.history.endTime') ?? ''
            case 'customerSupportFullName':
                return t('chat.history.csaName') ?? ''
            case 'endUserName':
                return t('global.name') ?? ''
            case 'endUserEmail':
                return t('global.email') ?? ''
            case 'contactsMessage':
                return t('chat.history.contact') ?? ''
            case 'comment':
                return t('chat.history.comment') ?? ''
            case 'feedbackRating':
                return t('chat.history.rating') ?? ''
            case 'feedbackText':
                return t('chat.history.feedback') ?? ''
            case 'status':
                return t('global.status') ?? ''
            case 'endUserUrl':
                return 'www'
            case 'id':
                return 'id';
            case 'istest':
                return t('global.test') ?? ''
            case 'isPreserve':
                return t('global.preserve') ?? ''
            default:
                return '';
        }
    }

    const handleChatStatusChange = (event: string) => {
        if (!selectedChat) return;
        chatStatusChangeMutation.mutate({
            chatId: selectedChat.id,
            event: event.toUpperCase(),
        });
    };

    const handleCommentChange = (comment: string) => {
        if (!selectedChat) return;
        chatCommentChangeMutation.mutate({
            chatId: selectedChat.id,
            comment,
            authorDisplayName: userInfo!.displayName,
        });
    };

    const getFilteredColumns = () => {
        const realSelectedColumns = getRealSelectedColumns(selectedColumns);

        if (realSelectedColumns.length === 0) return endedChatsColumns;
        return endedChatsColumns.filter((c) =>
            ['detail', 'forward', ...realSelectedColumns].includes(c.id ?? '')
        );
    };

    const filterChatsList = (chatsList: ChatType[]) => {
        const startDate = Date.parse(
            format(new Date(control._formValues.startDate), 'MM/dd/yyyy')
        );

        const endDate = Date.parse(
            format(new Date(control._formValues.endDate), 'MM/dd/yyyy')
        );

        setFilteredEndedChatsList(
            chatsList.filter((c) => {
                const ended = Date.parse(format(new Date(c.ended), 'MM/dd/yyyy'));
                return ended >= startDate && ended <= endDate;
            })
        );
    };

    const mapChatsToExportRows = (
        chats: ChatType[],
        allColumns: any[],
        selectedColumns: string[],
        t: (key: string) => string
    ): ExportResult => {
        const realSelectedColumns = getRealSelectedColumns(selectedColumns);
        const activeColumns =
            realSelectedColumns.length > 0
                ? allColumns.filter(
                    (col) => col.id && col.id !== 'detail' && realSelectedColumns.includes(col.id)
                )
                : allColumns.filter((col) => col.id && col.id !== 'detail');

        const headers = activeColumns.map(
            (col) => getColumnTranslation(col.id) || col.header || col.id
        );

        const rows = chats.map((chat) =>
            activeColumns.map((col) => {
                let rawValue: any = null;

                if (typeof col.accessorFn === 'function') {
                    rawValue = col.accessorFn(chat, 0);
                } else if (typeof col.accessorKey === 'string') {
                    rawValue = (chat as any)[col.accessorKey];
                }

                let processedValue: any = rawValue;
                const totalCheck = chat.isFiveRatingScale === 'true' ? 5 : 10;
                switch (col.id) {
                    case 'created':
                    case 'ended':
                        processedValue = rawValue
                            ? format(
                                new Date(rawValue),
                                'dd.MM.yyyy HH:mm:ss',
                                i18n.language === 'et' ? {locale: et} : undefined
                            )
                            : '';
                        break;
                    case 'contactsMessage':
                        processedValue = rawValue ? t('global.yes') : t('global.no');
                        break;
                    case 'feedbackRating':
                        processedValue = rawValue == null ? '' : `${rawValue}/${totalCheck}`;
                        break;
                    case 'status':
                        processedValue =
                            chat.status === CHAT_STATUS.ENDED
                                ? t('chat.plainEvents.' + (chat.lastMessageEvent ?? ''))
                                : '';
                        break;
                    case 'endUserName':
                        processedValue = `${chat.endUserFirstName ?? ''} ${chat.endUserLastName ?? ''}`;
                        break;
                    default:
                        processedValue =
                            typeof rawValue === 'object' ? JSON.stringify(rawValue) : rawValue ?? '';
                }

                return processedValue;
            })
        );

        const chatIds = chats.map((c) => c.id);

        return {headers, rows, chatIds};
    };


    const downloadChatHistory = async () => {
        setLoading(true);
        try {
            let sortBy = 'created desc';
            if (sorting.length > 0) {
                const sortType = sorting[0].desc ? 'desc' : 'asc';
                sortBy = `${sorting[0].id} ${sortType}`;
            }

            const realSelectedColumns = getRealSelectedColumns(selectedColumns);
            const { headers } = mapChatsToExportRows([], endedChatsColumns, realSelectedColumns, t);
            const activeColumns = realSelectedColumns.length > 0
                ? endedChatsColumns.filter((col) => col.id && col.id !== 'detail' && realSelectedColumns.includes(col.id))
                : endedChatsColumns.filter((col) => col.id && col.id !== 'detail');
            const columnIds = activeColumns.map((col) => col.id!);

            const response = await apiDevEnded.post<{
                readonly response: {
                    readonly data: {
                        readonly url: string;
                    };
                };
            }>('chats/ended/download', {
                headers,
                columnIds,
                language: i18n.language,
                startDate: formatISO(startOfDay(new Date(startDate))),
                endDate: formatISO(endOfDay(new Date(endDate))),
                urls: getDomainsArray(currentDomains),
                sorting: sortBy,
                search,
            });
            const downloadData = response.data.response.data;

            await saveFile(
                downloadData.url,
                'history.xlsx',
            );

        } catch (error) {
            console.error('Error downloading chat history file:', error);
        } finally {
            setLoading(false);
        }
    };

    const endUserFullName = getUserName();

    const isClearFiltersVisible = useMemo(()=> {
        return search.length > 0 || selectedColumns.length > 0;
    }, [search, selectedColumns]);

    const onClearFilersClick = () => {
        const clearedColumns: string[] = [];
        setSelectedColumns(clearedColumns);
        setCounterKey(0);
        setValue('search', '');
        updatePagePreferences.mutate({
            page_results: pagination.pageSize,
            selected_columns: clearedColumns
        });
    };

    if (!filteredEndedChatsList) return <>Loading... {{filteredEndedChatsList}} something is wrong </>;

    return (
        <div className="history-page-wrapper">
            <div className="header-container">
                {displayTitle && (
                    <h1>{t('chat.history.title')}{totalCount === null ? '' : ` (${totalCount.toLocaleString('et-EE')})`}</h1>
                )}

                {showDownload && (
                    <div>
                        <Button
                            type="button"
                            appearance={"secondary"}
                            size="s"
                            style={{ marginTop: '4px' }}
                            onClick={downloadChatHistory}
                        >
                            {loading && <CgSpinner className="spinner" />}
                            {!loading && t('files.download_xlsx')}
                        </Button>
                    </div>
                )}
            </div>

            <div className={`history-content${getAllEndedChats.isPending ? ' history-content--loading' : ''}`}>
            <Card style={{marginBottom: '16px'}}>
                <Track gap={16}>
                    {displaySearchBar && (
                        <Controller name="search" control={control} render={({ field }) => {
                            return <FormInput
                                label={t('chat.history.searchChats')}
                                hideLabel
                                name="searchChats"
                                value={field.value}
                                placeholder={t('chat.history.searchChats') + '...'}
                                onChange={(e) => {
                                    setPagination({ pageIndex: 0, pageSize: pagination.pageSize });
                                    setSearchParams((params) => {
                                        params.set("page", "1");
                                        return params;
                                    });
                                    field.onChange(e.target.value);
                                    debouncedGetAllEnded(e.target.value);
                                }}
                            />
                        }} />
                    )}
                    <Track gap={16}>
                        {displayDateFilter && (
                            <>
                                <Track gap={10}>
                                    <p>{t('global.from')}</p>
                                    <Controller
                                        name="startDate"
                                        control={control}
                                        render={({field}) => {
                                            return (
                                                <FormDatepicker
                                                    {...field}
                                                    label={''}
                                                    value={field.value ?? new Date()}
                                                    onChange={(v) => {
                                                        field.onChange(v);
                                                        const start = formatISO(startOfDay(new Date(v)));
                                                        const resetPagination = { pageIndex: 0, pageSize: pagination.pageSize };
                                                        setPagination(resetPagination);
                                                        setSearchParams((params) => {
                                                            params.set("page", "1");
                                                            params.set('start', start);
                                                            return params;
                                                        });
                                                        getAllEndedChats.mutate({
                                                            startDate: start,
                                                            endDate: formatISO(endOfDay(new Date(endDate))),
                                                            pagination: resetPagination,
                                                            sorting,
                                                            search,
                                                        });
                                                    }}
                                                />
                                            );
                                        }}
                                    />
                                </Track>
                                <Track gap={10}>
                                    <p>{t('global.to')}</p>
                                    <Controller
                                        name="endDate"
                                        control={control}
                                        render={({field}) => {
                                            return (
                                                <FormDatepicker
                                                    {...field}
                                                    label={''}
                                                    value={field.value ?? new Date()}
                                                    onChange={(v) => {
                                                        field.onChange(v);
                                                        const end = formatISO(endOfDay(new Date(v)));
                                                        const resetPagination = { pageIndex: 0, pageSize: pagination.pageSize };
                                                        setPagination(resetPagination);
                                                        setSearchParams((params) => {
                                                            params.set("page", "1");
                                                            params.set('end', end);
                                                            return params;
                                                        });
                                                        getAllEndedChats.mutate({
                                                            startDate: formatISO(startOfDay(new Date(startDate))),
                                                            endDate: end,
                                                            pagination: resetPagination,
                                                            sorting,
                                                            search,
                                                        });
                                                    }}
                                                />
                                            );
                                        }}
                                    />
                                </Track>
                            </>
                        )}
                        <Track style={{width: '240px'}}>
                        <FormMultiselect
                            key={counterKey}
                            name="visibleColumns"
                            label={t('')}
                            placeholder={t('chat.history.chosenColumn')}
                            options={visibleColumnOptions}
                            selectedOptions={visibleColumnOptions.filter((o) =>
                                selectedColumns.includes(o.value)
                            )}
                            selectedOptionsCount={getRealSelectedColumns(selectedColumns).length}
                            onSelectionChange={(selection) => {
                                const columns = normalizeSelectedColumns(selection?.map((s) => s.value) ?? []);
                                setSelectedColumns(columns);
                                setCounterKey(prev => prev + 1);
                                updatePagePreferences.mutate({
                                    page_results: pagination.pageSize,
                                    selected_columns: getRealSelectedColumns(columns)
                                })
                            }}
                            />
                        </Track>
                    </Track>
                </Track>
            </Card>

            {sorting && sorting.length > 0 && showSortingLabel && (
                <div>
                    <Button disabled={true} appearance="secondary">
                        {getSortingString()}
                    </Button>
                </div>)
            }
            {isClearFiltersVisible && (
                <Track justify="between" style={{ marginBottom: '16px' }}>
                    <ClearFiltersButton style={{ marginLeft: 'auto' }} onClick={onClearFilersClick} />
                </Track>
            )}
            <div className="card-drawer-container">
                <div className="card-wrapper">
                    <Card>
                        <DataTable
                            data={filteredEndedChatsList}
                            sortable
                            columns={getFilteredColumns()}
                            selectedRow={(row) => row.original.id === selectedChat?.id}
                            pagination={pagination}
                            columnPinning={columnPinning}
                            sorting={sorting}
                            setPagination={(state: PaginationState) => {
                                if (
                                    state.pageIndex === pagination.pageIndex &&
                                    state.pageSize === pagination.pageSize
                                )
                                    return;
                                setPagination(state);
                                updatePagePreferences.mutate({
                                    page_results: state.pageSize,
                                    selected_columns: getRealSelectedColumns(selectedColumns)
                                });
                                getAllEndedChats.mutate({
                                    startDate: formatISO(startOfDay(new Date(startDate))),
                                    endDate: formatISO(endOfDay(new Date(endDate))),
                                    pagination: state,
                                    sorting,
                                    search,
                                });
                            }}
                            setSorting={(state: SortingState) => {
                                setSorting(state);
                                getAllEndedChats.mutate({
                                    startDate: formatISO(startOfDay(new Date(startDate))),
                                    endDate: formatISO(endOfDay(new Date(endDate))),
                                    pagination,
                                    sorting: state,
                                    search,
                                });
                            }}
                            isClientSide={false}
                            pagesCount={totalPages}
                            totalCountLabel={totalCount === null ? null : `${t('chat.history.title')} ${totalCount.toLocaleString('et-EE')}`}
                        />
                    </Card>
                </div>

                {selectedChat && (
                    <>
                        <div className="drawer-container">
                            <Drawer
                                title={
                                    selectedChat.endUserFirstName !== '' &&
                                    selectedChat.endUserLastName !== ''
                                        ? `${selectedChat.endUserFirstName} ${selectedChat.endUserLastName}`
                                        : t('global.anonymous')
                                }
                                onClose={() => setSelectedChat(null)}
                            >
                                <HistoricalChat
                                    chat={selectedChat}
                                    trigger={messagesTrigger}
                                    onChatStatusChange={setStatusChangeModal}
                                    selectedStatus={chatState}
                                    onCommentChange={handleCommentChange}
                                    toastContext={toastContext}
                                    showComment={showComment}
                                    showStatus={showStatus}
                                    onMessageClick={(message) => {
                                        onMessageClick?.(message);
                                    }}
                                />
                            </Drawer>
                        </div>
                        <div className="side-meta">
                            <div>
                                <p>
                                    <strong>ID</strong>
                                </p>
                                <p>{selectedChat.id}</p>
                            </div>
                            <div>
                                <p>
                                    <strong>{t('chat.endUser')}</strong>
                                </p>
                                <p>{endUserFullName}</p>
                            </div>
                            {selectedChat.endUserId && (
                                <div>
                                    <p>
                                        <strong>{t('chat.endUserId')}</strong>
                                    </p>
                                    <p>{selectedChat.endUserId ?? ''}</p>
                                </div>
                            )}
                            {selectedChat.endUserEmail && (
                                <div>
                                    <p>
                                        <strong>{t('chat.endUserEmail')}</strong>
                                    </p>
                                    <p>{selectedChat.endUserEmail}</p>
                                </div>
                            )}
                            {selectedChat.endUserPhone && (
                                <div>
                                    <p>
                                        <strong>{t('chat.endUserPhoneNumber')}</strong>
                                    </p>
                                    <p>{selectedChat.endUserPhone}</p>
                                </div>
                            )}
                            {selectedChat.customerSupportDisplayName && (
                                <div>
                                    <p>
                                        <strong>{t('chat.csaName')}</strong>
                                    </p>
                                    <p>{selectedChat.customerSupportDisplayName}</p>
                                </div>
                            )}
                            <div>
                                <p>
                                    <strong>{t('chat.startedAt')}</strong>
                                </p>
                                <p>
                                    {format(
                                        new Date(selectedChat.created),
                                        'dd. MMMM Y HH:mm:ss',
                                        {
                                            locale: et,
                                        }
                                    ).toLowerCase()}
                                </p>
                            </div>
                            <div>
                                <p>
                                    <strong>{t('chat.device')}</strong>
                                </p>
                                <p>{selectedChat.endUserOs}</p>
                            </div>
                            <div>
                                <p>
                                    <strong>{t('chat.location')}</strong>
                                </p>
                                <p>{selectedChat.endUserUrl}</p>
                            </div>
                            {selectedChat.comment && (
                                <div>
                                    <p>
                                        <strong>{t('chat.history.comment')}</strong>
                                    </p>
                                    <p>{selectedChat.comment}</p>
                                </div>
                            )}
                            {selectedChat.commentAuthor && (
                                <div>
                                    <p>
                                        <strong>{t('chat.history.commentAuthor')}</strong>
                                    </p>
                                    <p>{selectedChat.commentAuthor}</p>
                                </div>
                            )}
                            {selectedChat.commentAddedDate && (
                                <div>
                                    <p>
                                        <strong>{t('chat.history.commentAddedDate')}</strong>
                                    </p>
                                    <p>
                                        {format(
                                            new Date(selectedChat.commentAddedDate),
                                            'dd.MM.yyyy'
                                        )}
                                    </p>
                                </div>
                            )}
                            {selectedChat.lastMessageEvent && (
                                <div>
                                    <p>
                                        <strong>{t('global.status')}</strong>
                                    </p>
                                    <p>
                                        {t('chat.plainEvents.' + selectedChat.lastMessageEvent)}
                                    </p>
                                </div>
                            )}
                            {selectedChat.userDisplayName && (
                                <div>
                                    <p>
                                        <strong>{t('chat.history.statusAdder')}</strong>
                                    </p>
                                    <p>{selectedChat.userDisplayName}</p>
                                </div>
                            )}
                            {selectedChat.lastMessageTimestamp && (
                                <div>
                                    <p>
                                        <strong>{t('chat.history.statusAddedDate')}</strong>
                                    </p>
                                    <p>
                                        {format(
                                            new Date(selectedChat.lastMessageTimestamp),
                                            'dd.MM.yyyy'
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            </div>

            {statusChangeModal && (
                <Dialog
                    title={t('chat.changeStatus')}
                    onClose={() => setStatusChangeModal(null)}
                    footer={
                        <>
                            <Button
                                appearance="secondary"
                                onClick={() => {
                                    setChatState(null);
                                    setStatusChangeModal(null);
                                }}
                            >
                                {t('global.cancel')}
                            </Button>
                            <Button
                                appearance="error"
                                onClick={() => {
                                    setChatState(statusChangeModal);
                                    handleChatStatusChange(statusChangeModal);
                                }}
                            >
                                {t('global.yes')}
                            </Button>
                        </>
                    }
                >
                    <p>{t('global.removeValidation')}</p>
                </Dialog>
            )}
        </div>
    );

    function getUserName() {
        return selectedChat?.endUserFirstName !== '' &&
        selectedChat?.endUserLastName !== ''
            ? `${selectedChat?.endUserFirstName} ${selectedChat?.endUserLastName}`
            : t('global.anonymous');
    }
};

export default ChatHistory;
