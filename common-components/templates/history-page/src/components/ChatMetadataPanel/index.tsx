import { format } from "date-fns";
import { et } from "date-fns/locale";
import { FC, PropsWithChildren, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Chat as ChatType } from "../../../../../types/chat";

import './ChatMetadataPanel.scss';

type ChatMetadataPanelProps = PropsWithChildren<{
  readonly chat: ChatType
}>;

const ChatMetadataPanel: FC<ChatMetadataPanelProps> = ({ chat, children }) => {
  const { t } = useTranslation();

  const endUserFullName = useMemo(() => {
    return chat.endUserFirstName !== '' &&
      chat?.endUserLastName !== ''
      ? `${chat.endUserFirstName} ${chat.endUserLastName}`
      : t('global.anonymous');
  }, [chat, t]);

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
          <MetadataItem label={t('chat.history.comment')} value={chat.comment} />
        )}
        {chat.commentAuthor && (
          <MetadataItem label={t('chat.history.commentAuthor')} value={chat.commentAuthor} />
        )}
        {chat.commentAddedDate && (
          <MetadataItem
            label={t('chat.history.commentAddedDate')}
            value={format(
              new Date(chat.commentAddedDate),
              'dd.MM.yyyy'
            )}
          />
        )}
        {chat.lastMessageEvent && (
          <MetadataItem
            label={t('global.status')}
            value={t('chat.plainEvents.' + chat.lastMessageEvent)}
          />
        )}
        {chat.userDisplayName && (
          <MetadataItem
            label={t('chat.history.statusAdder')}
            value={chat.userDisplayName}
          />
        )}
        {chat.lastMessageTimestamp && (
          <MetadataItem
            label={t('chat.history.statusAddedDate')}
            value={format(
              new Date(chat.lastMessageTimestamp),
              'dd.MM.yyyy'
            )}
          />
        )}
      </div>
      {children}
    </div>
  </>;
};

type MetadataItemProps = {
  readonly label?: string;
  readonly value: string;
  readonly meta?: string;
};

const MetadataItem: FC<MetadataItemProps> = ({ label, value, meta }) => {
  return <>
    {label && <p>
      <strong>{label}</strong>
    </p>}
    <p className="metadata-item__value">{value}</p>
    {meta && <p className="metadata-item__meta">{meta}</p>}
  </>;
}

export { ChatMetadataPanel };
