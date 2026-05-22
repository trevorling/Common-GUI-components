import { format } from "date-fns";
import { et } from "date-fns/locale";
import { ComponentProps, FC, PropsWithChildren, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Chat as ChatType } from "../../../../../types/chat";

import './ChatMetadataPanel.scss';
import { CharMeasurementType } from "../../types";

type ChatMetadataPanelProps = PropsWithChildren<{
  readonly chat: ChatType
  readonly chatMeasurments: ComponentProps<typeof Measurements>['measurments'];
}>;

const formatMetaDate = (date: string) => format(
  new Date(date),
  'd.MMMM yyyy HH:mm:ss',
  {
    locale: et,
  }
).toLowerCase();

const formatAuthor = (value?: string) => value ? `(${value})` : '';

const formatMeta = (date?: string, author?: string) => {
  const formattedDate = date ? formatMetaDate(date) : '';
  const formattedAuthor = formatAuthor(author);

  return [formattedDate, formattedAuthor].filter(Boolean).join(' ');
};

const ChatMetadataPanel: FC<ChatMetadataPanelProps> = ({ chat, chatMeasurments, children }) => {
  const { t } = useTranslation();

  const endUserFullName = useMemo(() => {
    return chat.endUserFirstName !== '' &&
      chat?.endUserLastName !== ''
      ? `${chat.endUserFirstName} ${chat.endUserLastName}`
      : t('global.anonymous');
  }, [chat, t]);

  const commentMeta = useMemo(
    () => formatMeta(chat.commentAddedDate, chat.commentAuthor),
    [chat.commentAddedDate, chat.commentAuthor]
  );

  const statusMeta = useMemo(
    () => formatMeta(chat.lastMessageTimestamp, chat.userDisplayName),
    [chat.lastMessageTimestamp, chat.userDisplayName]
  );
  
  return <>
    <div className="side-meta">
      <div className="side-meta__content">
        <MetadataItem label="ID" value={chat.id} />
        <MetadataItem label={t('chat.endUser')} value={endUserFullName} />
        {chat.endUserId && (
          <MetadataItem label={t('chat.endUserId')} value={chat.endUserId ?? ''} />
        )}
        {chat.endUserEmail && (
          <MetadataItem label={t('chat.endUserEmail')} value={chat.endUserEmail} />
        )}
        {chat.endUserPhone && (
          <MetadataItem label={t('chat.endUserPhoneNumber')} value={chat.endUserPhone} />
        )}
        {chat.customerSupportDisplayName && (
          <MetadataItem label={t('chat.csaName')} value={chat.customerSupportDisplayName} />
        )}
        <MetadataItem
          label={t('chat.startedAt')}
          value={format(
            new Date(chat.created),
            'dd. MMMM Y HH:mm:ss',
            {
              locale: et,
            }
          ).toLowerCase()}
        />
        <MetadataItem label={t('chat.device')} value={chat.endUserOs ?? ''} />
        <MetadataItem label={t('chat.location')} value={chat.endUserUrl ?? ''} />
        {chat.comment && (
          <MetadataItem
            label={t('chat.history.comment')}
            value={chat.comment}
            meta={commentMeta}
          />
        )}
        {chat.lastMessageEvent && (
          <MetadataItem
            label={t('global.status')}
            value={t('chat.plainEvents.' + chat.lastMessageEvent)}
            meta={statusMeta}
          />
        )}
        <Measurements measurments={chatMeasurments} />
      </div>
      {children}
    </div>
  </>;
};

const Measurements: FC<{
  readonly measurments: CharMeasurementType[];
}> = ({ measurments }) => {
  const { t } = useTranslation();

  const groupedMeasurements = useMemo(() => {
    const typeOrder: CharMeasurementType['type'][] = [
      'THEME',
      'QUALITY',
      'FOLLOW_UP_ACTION',
    ];

    const grouped = measurments.reduce<
      Partial<
        Record<
          CharMeasurementType['type'],
          Record<
            string,
            {
              createdAt: string;
              authorDisplayName: string;
              values: string[];
            }
          >
        >
      >
    >((acc, item) => {
      acc[item.type] ??= {};

      acc[item.type]![item.createdAt] ??= {
        createdAt: item.createdAt,
        authorDisplayName: item.authorDisplayName,
        values: [],
      };

      if (item.value) {
        acc[item.type]![item.createdAt].values.push(item.value);
      }

      return acc;
    }, {});

    return typeOrder
      .map((type) => ({
        type,
        items: Object.values(grouped[type] ?? {})
          .map((item) => ({
            createdAt: item.createdAt,
            authorDisplayName: item.authorDisplayName,
            value: item.values.join(', '),
          }))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          ),
      }))
      .filter(({ items }) => items.length > 0);
  }, [measurments]);

  const getLabel = (type: CharMeasurementType['type']) =>
    ({
      THEME: t('chat.quality.theme'),
      QUALITY: t('chat.quality.responseQuality'),
      FOLLOW_UP_ACTION: t('chat.quality.followUpAction'),
    })[type];

  return (
    <>
      <div className="divider"></div>

      {groupedMeasurements.map(({ type, items }) =>
        items.map((item, index) => (
          <MetadataItem
            labelStyle={{ marginTop: '12px' }}
            key={`${type}-${item.createdAt}`}
            {...((index === 0) ? { label: getLabel(type) } : {})}
            value={item.value || t('chat.quality.selectionEmptied')}
            meta={formatMeta(item.createdAt, item.authorDisplayName)}
          />
        ))
      )}
    </>
  );
};


type MetadataItemProps = {
  readonly label?: string;
  readonly value: string;
  readonly meta?: string;
  readonly labelStyle?: React.CSSProperties;
};

const MetadataItem: FC<MetadataItemProps> = ({ label, value, meta, labelStyle }) => {
  return <>
    {label && <p style={labelStyle}>
      <strong>{label}</strong>
    </p>}
    <p className="metadata-item__value">{value}</p>
    {meta && <p className="metadata-item__meta">{meta}</p>}
  </>;
}

export { ChatMetadataPanel };
