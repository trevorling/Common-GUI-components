import {
  CSSProperties,
  FC,
  FocusEvent as ReactFocusEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { MdArrowDropDown, MdExpandMore, MdSearch } from 'react-icons/md';

import { Icon } from '../..';
import './FormCombobox.scss';

type FormComboboxOption = {
  readonly label: string;
  readonly value: string;
};

type FormComboboxBaseProps = {
  readonly label?: ReactNode;
  readonly name?: string;
  readonly placeholder?: string;
  readonly searchPlaceholder?: string;
  readonly options: FormComboboxOption[];
  readonly hideLabel?: boolean;
  readonly disabled?: boolean;
  readonly style?: CSSProperties;
  readonly isSearchEnabled?: boolean;
  readonly hideInputStyle?: boolean;
};

type FormComboboxSingleProps = FormComboboxBaseProps & {
  readonly multiple?: false;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onChange?: (value: string) => void;
  readonly onSelectionChange?: (selection: FormComboboxOption | null) => void;
};

type FormComboboxMultipleProps = FormComboboxBaseProps & {
  readonly multiple: true;
  readonly value?: string[];
  readonly defaultValue?: string[];
  readonly onChange?: (value: string[]) => void;
  readonly onSelectionChange?: (selection: FormComboboxOption[] | null) => void;
};

type FormComboboxProps = FormComboboxSingleProps | FormComboboxMultipleProps;

type FormComboboxValueProps =
  | {
      readonly multiple?: false;
      readonly value?: string;
      readonly defaultValue?: string;
    }
  | {
      readonly multiple: true;
      readonly value?: string[];
      readonly defaultValue?: string[];
    };

const getInitialSingleValue = (props: FormComboboxValueProps): string => {
  if (props.multiple === true) {
    return '';
  }

  return props.defaultValue ?? '';
};

const getInitialMultipleValue = (props: FormComboboxValueProps): string[] => {
  if (!props.multiple) {
    return [];
  }

  return props.defaultValue ?? [];
};

const getSelectedValues = (
  props: FormComboboxValueProps,
  internalSingleValue: string,
  internalMultipleValue: string[]
): string[] => {
  if (props.multiple === true) {
    return props.value ?? internalMultipleValue;
  }

  if (props.value) {
    return [props.value];
  }

  if (internalSingleValue) {
    return [internalSingleValue];
  }

  return [];
};

const orderSelectedOptionsFirst = (
  options: FormComboboxOption[],
  selectedValues: string[]
): FormComboboxOption[] => {
  if (selectedValues.length === 0) return options;

  const selectedValueSet = new Set(selectedValues);
  const selectedOptions: FormComboboxOption[] = [];
  const unselectedOptions: FormComboboxOption[] = [];

  options.forEach((option) => {
    if (selectedValueSet.has(option.value)) {
      selectedOptions.push(option);
      return;
    }

    unselectedOptions.push(option);
  });

  return [...selectedOptions, ...unselectedOptions];
};

export const FormCombobox: FC<FormComboboxProps> = ({
  label,
  hideLabel,
  placeholder,
  searchPlaceholder,
  options,
  disabled,
  style,
  isSearchEnabled = false,
  hideInputStyle = false,
  ...props
}) => {
  const id = useId();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [internalSingleValue, setInternalSingleValue] = useState<string>(
    getInitialSingleValue(props)
  );
  const [internalMultipleValue, setInternalMultipleValue] = useState<string[]>(
    getInitialMultipleValue(props)
  );
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const isMultiple = props.multiple === true;
  const selectedValues = getSelectedValues(props, internalSingleValue, internalMultipleValue);

  const orderedOptions = useMemo(() => (
    orderSelectedOptionsFirst(options, selectedValues)
  ), [options, selectedValues]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return orderedOptions;

    return orderedOptions.filter((option) => (
      option.label.toLowerCase().includes(normalizedQuery)
    ));
  }, [orderedOptions, query]);

  const selectedOptions = useMemo(() => (
    options.filter((option) => selectedValues.includes(option.value))
  ), [options, selectedValues]);

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  const closeOnFocusOutside = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
      setQuery('');
    }
  };

  const setSingleValue = (option: FormComboboxOption) => {
    if (props.multiple) return;
    const singleProps = props as FormComboboxSingleProps;
    const nextValue = selectedValues.includes(option.value) ? '' : option.value;
    const nextSelection = nextValue ? option : null;

    if (singleProps.value === undefined) {
      setInternalSingleValue(nextValue);
    }

    singleProps.onChange?.(nextValue);
    singleProps.onSelectionChange?.(nextSelection);
    setIsOpen(false);
    setQuery('');
  };

  const setMultipleValue = (option: FormComboboxOption) => {
    if (!props.multiple) return;
    const multipleProps = props as FormComboboxMultipleProps;

    const nextValues = selectedValues.includes(option.value)
      ? selectedValues.filter((value) => value !== option.value)
      : [...selectedValues, option.value];
    const nextSelection = options.filter((item) => nextValues.includes(item.value));

    if (multipleProps.value === undefined) {
      setInternalMultipleValue(nextValues);
    }

    multipleProps.onChange?.(nextValues);
    multipleProps.onSelectionChange?.(nextSelection.length ? nextSelection : null);
  };

  const selectOption = (option: FormComboboxOption) => {
    if (disabled) return;

    if (props.multiple) {
      setMultipleValue(option);
      return;
    }

    setSingleValue(option);
  };

  const placeholderValue = placeholder || t('global.choose');
  const triggerLabel = isMultiple
    ? selectedOptions.length > 0
      ? selectedOptions.map((option) => option.label).join(', ')
      : placeholderValue
    : selectedOptions[0]?.label ?? placeholderValue;
  const triggerContent = hideInputStyle ? label ?? triggerLabel : triggerLabel;

  const selectClasses = clsx(
    'select',
    disabled && 'select--disabled',
    isOpen && 'select--open',
    hideInputStyle && 'select--plain',
  );

  return (
    <div ref={wrapperRef} className={selectClasses} style={style} onBlur={closeOnFocusOutside}>
      {label && !hideLabel && <label htmlFor={id} className='select__label'>{label}</label>}
      <div className='select__wrapper'>
        <button
          id={id}
          type='button'
          className='select__trigger'
          aria-label={hideInputStyle && typeof label === 'string' ? label : undefined}
          aria-haspopup='listbox'
          aria-expanded={isOpen}
          disabled={disabled}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className='select__trigger-text'>{triggerContent}</span>
          <Icon
            label='Dropdown icon'
            size='medium'
            icon={hideInputStyle ? <MdExpandMore color='#5D6071' /> : <MdArrowDropDown color='#5D6071' />}
          />
        </button>

        {isOpen && (
          <div className='select__menu select__menu--combobox'>
            {
              isSearchEnabled && <div className='select__search'>
                <Icon
                  label='Search icon'
                  size='medium'
                  className='select__search-icon'
                  icon={<MdSearch className='search__icon-size' color='#5D6071' />}
                />
                <input
                  ref={searchInputRef}
                  className='select__search-input'
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder ?? t('global.search')}
                  disabled={disabled}
                />
              </div>
            }

            <ul className='select__options' role='listbox' aria-label={searchPlaceholder ?? t('global.search')}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);

                  return (
                    <li
                      key={option.value}
                      role='option'
                      aria-selected={isSelected}
                      className='select__option select__option--combobox'
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectOption(option)}
                    >
                      <input
                        type={isMultiple ? 'checkbox' : 'radio'}
                        checked={isSelected}
                        value={option.value}
                        onChange={() => null}
                        onClick={(event) => event.preventDefault()}
                      />
                      <span>{option.label}</span>
                    </li>
                  );
                })
              ) : null}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormCombobox;
