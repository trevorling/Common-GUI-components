import { ComponentProps, FC } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormCombobox, Track } from '../../../../../ui-components';

import './QualitySettings.scss';

type QualitySettingsProps = {
  readonly theme: {
    readonly onChange: (value: string[]) => void;
    readonly options: Pick<ComponentProps<typeof FormCombobox>, 'options'>['options'];
    readonly value: string[];
  };
  readonly quality: {
    readonly onChange: (value: string) => void;
    readonly options: Pick<ComponentProps<typeof FormCombobox>, 'options'>['options'];
    readonly value?: string;
  };
  readonly followUp: {
    readonly onChange: (value: string) => void;
    readonly options: Pick<ComponentProps<typeof FormCombobox>, 'options'>['options'];
    readonly value?: string;
  };
};

const QualitySettings: FC<QualitySettingsProps> = ({ theme, quality, followUp }) => {
  const { t } = useTranslation();
  const form = useForm<{
    readonly theme: string[];
    readonly quality: string;
    readonly followUp: string;
  }>({
    defaultValues: {
      theme: [],
      quality: '',
      followUp: '',
    },
    values: {
      theme: theme.value,
      quality: quality.value ?? '',
      followUp: followUp.value ?? '',
    },
  });

  const handleThemeChange = (value: string[], onChange: (value: string[]) => void) => {
    onChange(value);
    theme.onChange(value);
  };

  const handleQualityChange = (value: string, onChange: (value: string) => void) => {
    onChange(value);
    quality.onChange(value);
  };

  const handleFollowUpChange = (value: string, onChange: (value: string) => void) => {
    onChange(value);
    followUp.onChange(value);
  };

  return (
    <Track
      gap={8}
      direction="vertical"
      align="left"
      className="quality-settings"
    >
      <p className="title">{t('chat.history.analysis')}</p>

      <Controller
        name="theme"
        control={form.control}
        render={({ field }) => (
          <FormCombobox
            multiple={true}
            placeholder={t('chat.history.chooseConversationTheme')}
            searchPlaceholder={t('chat.history.conversationTheme')}
            options={theme.options}
            value={field.value}
            onChange={(value) => handleThemeChange(value, field.onChange)}
            isSearchEnabled={true}
          />
        )}
      />
      <Controller
        name="quality"
        control={form.control}
        render={({ field }) => (
          <FormCombobox
            placeholder={t('chat.history.chooseConversationResponseQuality')}
            searchPlaceholder={t('chat.history.conversationResponseQuality')}
            options={quality.options}
            value={field.value}
            onChange={(value) => handleQualityChange(value, field.onChange)}
          />
        )}
      />
      <Controller
        name="followUp"
        control={form.control}
        render={({ field }) => (
          <FormCombobox
            placeholder={t('chat.history.chooseFollowUpAction')}
            searchPlaceholder={t('chat.history.followUpAction')}
            options={followUp.options}
            value={field.value}
            onChange={(value) => handleFollowUpChange(value, field.onChange)}
          />
        )}
      />
    </Track>
  );
};

export { QualitySettings };
