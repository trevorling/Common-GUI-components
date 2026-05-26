import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { MdFilterList } from 'react-icons/md';

import { ClearFiltersButton } from '../../../../../ui-components';
import { FilterTag } from '../FilterTag';

import './SelectedFilterTags.scss';

type SelectedFilterTagsProps = {
  readonly csaFilterTagValues: string[];
  readonly getCsaFilterTagLabel: (value: string) => string;
  readonly showAuthenticatedPerson?: boolean;
  readonly showTestFilter: boolean;
  readonly isTestFilter?: boolean;
  readonly domains: string[];
  readonly feedbackRatings: string[];
  readonly status: string[];
  readonly onRemoveCsaFilterTag: (value: string) => void;
  readonly onRemoveAuthenticatedPersonFilterTag: (value: boolean) => void;
  readonly onRemoveTestFilterTag: (value: boolean) => void;
  readonly onRemoveDomainFilterTag: (value: string) => void;
  readonly onRemoveFeedbackRatingFilterTag: (value: string) => void;
  readonly onRemoveStatusFilterTag: (value: string) => void;
  readonly onClearFiltersClick: () => void;
};

const SelectedFilterTags: FC<SelectedFilterTagsProps> = ({
  csaFilterTagValues,
  getCsaFilterTagLabel,
  showAuthenticatedPerson,
  showTestFilter,
  isTestFilter,
  domains,
  feedbackRatings,
  status,
  onRemoveCsaFilterTag,
  onRemoveAuthenticatedPersonFilterTag,
  onRemoveTestFilterTag,
  onRemoveDomainFilterTag,
  onRemoveFeedbackRatingFilterTag,
  onRemoveStatusFilterTag,
  onClearFiltersClick,
}) => {
  const { t } = useTranslation();
  const hasSelectedFilterTags =
    csaFilterTagValues.length !== 0 ||
    showAuthenticatedPerson !== undefined ||
    (showTestFilter && isTestFilter !== undefined) ||
    domains.length !== 0 ||
    feedbackRatings.length !== 0 ||
    status.length !== 0;

  if (!hasSelectedFilterTags) {
    return null;
  }

  return (
    <div className="selected-filters__container">
      <MdFilterList size="24" color="#878A97" style={{ width: '24px' }} />
      <div className="selected-filters">
        {csaFilterTagValues.length !== 0 && (
          <>
            <p className="selected-filters__label">{t('chat.history.csaName')}:</p>
            <div className="selected-filters__items">
              {csaFilterTagValues.map((item, index) => (
                <FilterTag
                  key={index}
                  text={getCsaFilterTagLabel(item)}
                  onClick={() => onRemoveCsaFilterTag(item)}
                />
              ))}
            </div>
          </>
        )}

        {showAuthenticatedPerson !== undefined && (
          <>
            <p className="selected-filters__label">{t('chat.history.authenticatedPerson')}:</p>
            <div className="selected-filters__items">
              <FilterTag
                text={showAuthenticatedPerson ? t('global.yes') : t('global.no')}
                onClick={() => onRemoveAuthenticatedPersonFilterTag(showAuthenticatedPerson)}
              />
            </div>
          </>
        )}

        {showTestFilter && isTestFilter !== undefined && (
          <>
            <p className="selected-filters__label">{t('global.test')}:</p>
            <div className="selected-filters__items">
              <FilterTag
                text={isTestFilter ? t('global.yes') : t('global.no')}
                onClick={() => onRemoveTestFilterTag(isTestFilter)}
              />
            </div>
          </>
        )}

        {domains.length !== 0 && (
          <>
            <p className="selected-filters__label">{t('chat.history.www')}:</p>
            <div className="selected-filters__items">
              {domains.map((item, index) => (
                <FilterTag
                  key={index}
                  text={item}
                  onClick={() => onRemoveDomainFilterTag(item)}
                />
              ))}
            </div>
          </>
        )}

        {feedbackRatings.length !== 0 && (
          <>
            <p className="selected-filters__label">{t('chat.history.rating')}:</p>
            <div className="selected-filters__items">
              {feedbackRatings.map((item, index) => (
                <FilterTag
                  key={index}
                  text={item}
                  onClick={() => onRemoveFeedbackRatingFilterTag(item)}
                />
              ))}
            </div>
          </>
        )}

        {status.length !== 0 && (
          <>
            <p className="selected-filters__label">{t('global.status')}:</p>
            <div className="selected-filters__items">
              {status.map((item, index) => (
                <FilterTag
                  key={index}
                  text={t(`chat.plainEvents.${item}`)}
                  onClick={() => onRemoveStatusFilterTag(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <ClearFiltersButton onClick={onClearFiltersClick} />
    </div>
  );
};

export { SelectedFilterTags };
