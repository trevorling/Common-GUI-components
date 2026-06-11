import { ComponentProps, FC } from 'react';

import { FormCombobox } from '../../../../../ui-components';

type HeaderComboboxBaseProps = {
  readonly label: string;
  readonly options?: ComponentProps<typeof FormCombobox>['options'];
  readonly isSearchEnabled?: ComponentProps<typeof FormCombobox>['isSearchEnabled'];
  readonly allOptionValue?: ComponentProps<typeof FormCombobox>['allOptionValue'];
};

type HeaderComboboxSingleProps = HeaderComboboxBaseProps & {
  readonly multiple: false;
  readonly value?: string;
  readonly onChange: (value: string) => void;
};

type HeaderComboboxMultipleProps = HeaderComboboxBaseProps & {
  readonly multiple?: true;
  readonly value?: string[];
  readonly onChange: (value: string[]) => void;
  readonly isApplyBtnVisible?: boolean;
};

type HeaderComboboxProps = HeaderComboboxSingleProps | HeaderComboboxMultipleProps;

const HeaderCombobox: FC<HeaderComboboxProps> = (props) => {
  const {
    label,
    options = [],
    isSearchEnabled = true,
    allOptionValue,
  } = props;
  const sharedProps = {
    hideInputStyle: true,
    hideLabel: true,
    label,
    placeholder: label,
    searchPlaceholder: label,
    options,
    isSearchEnabled,
    isMenuPortaled: true,
    allOptionValue,
  };

  return (
    <span
      className="history-header-combobox"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {props.multiple === false ? (
        <FormCombobox
          {...sharedProps}
          multiple={false}
          value={props.value}
          onChange={props.onChange}
        />
      ) : (
        <FormCombobox
          {...sharedProps}
          multiple={true}
          value={props.value}
          onChange={props.onChange}
          isApplyBtnVisible={props.isApplyBtnVisible}
        />
      )}
    </span>
  );
};

export { HeaderCombobox };
