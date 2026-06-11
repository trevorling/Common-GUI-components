import React, { FC, ReactNode, SelectHTMLAttributes, useEffect, useId, useState } from 'react';
import { useSelect } from 'downshift';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { MdArrowDropDown } from 'react-icons/md';

import { Button, Icon } from '../..';
import './FormSelect.scss';

type SelectOption = { label: string, value: string };

type FormMultiselectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    label: ReactNode;
    name: string;
    placeholder?: string;
    hideLabel?: boolean;
    options: SelectOption[];
    selectedOptions?: SelectOption[];
    selectedOptionsCount?: number;
    onSelectionChange?: (selection: SelectOption[] | null) => void;
    isApplyBtnVisible?: boolean;
    allOptionValue?: string;
};

const getNextSelectedItems = (
    selectedItem: SelectOption,
    options: SelectOption[],
    selectedItems: SelectOption[],
    allOptionValue?: string
): SelectOption[] => {
    if (!allOptionValue) {
        const index = selectedItems.findIndex((item) => item.value === selectedItem.value);
        const items: SelectOption[] = [];

        if (index > 0) {
            items.push(
                ...selectedItems.slice(0, index),
                ...selectedItems.slice(index + 1)
            );
        } else if (index === 0) {
            items.push(...selectedItems.slice(1));
        } else {
            items.push(...selectedItems, selectedItem);
        }

        return items;
    }

    const realOptions = options.filter((option) => option.value !== allOptionValue);
    const allOption = options.find((option) => option.value === allOptionValue);

    if (selectedItem.value === allOptionValue) {
        return selectedItems.some((item) => item.value === allOptionValue)
            ? []
            : [...(allOption ? [allOption] : []), ...realOptions];
    }

    const selectedWithoutAll = selectedItems.filter((item) => item.value !== allOptionValue);
    const isSelected = selectedWithoutAll.some((item) => item.value === selectedItem.value);
    const nextRealItems = isSelected
        ? selectedWithoutAll.filter((item) => item.value !== selectedItem.value)
        : [...selectedWithoutAll, selectedItem];

    if (
        allOption &&
        realOptions.length > 0 &&
        realOptions.every((option) => nextRealItems.some((item) => item.value === option.value))
    ) {
        return [allOption, ...realOptions];
    }

    return nextRealItems;
};

const FormMultiselect: FC<FormMultiselectProps> = (
    {
        label,
        hideLabel,
        options,
        disabled,
        placeholder,
        defaultValue,
        selectedOptions,
        selectedOptionsCount,
        onSelectionChange,
        isApplyBtnVisible = false,
        allOptionValue,
        ...rest
    },
) => {
    const id = useId();
    const { t } = useTranslation();
    const [selectedItems, setSelectedItems] = useState<SelectOption[]>(selectedOptions ?? []);
    const {
        isOpen,
        getToggleButtonProps,
        getLabelProps,
        getMenuProps,
        highlightedIndex,
        getItemProps,
    } = useSelect({
        items: options,
        stateReducer: (state, actionAndChanges) => {
            const { changes, type } = actionAndChanges;
            if (type === useSelect.stateChangeTypes.ItemClick) {
                return {
                    ...changes,
                    isOpen: true,
                    highlightedIndex: state.highlightedIndex,
                };
            } else {
                return changes;
            }
        },
        selectedItem: null,
        onSelectedItemChange: ({ selectedItem }) => {
            if (!selectedItem) {
                return;
            }
            const items = getNextSelectedItems(selectedItem, options, selectedItems, allOptionValue);

            setSelectedItems(items);
            if (!isApplyBtnVisible) {
                onSelectionChange?.(items.length ? items : null);
            }
        },
    });

    useEffect(() => {
        setSelectedItems(selectedOptions ?? []);
    }, [selectedOptions]);

    const applySelection = () => {
        onSelectionChange?.(selectedItems.length ? selectedItems : null);
    };

    const selectClasses = clsx(
        'select',
        disabled && 'select--disabled',
    );

    const placeholderValue = placeholder || t('global.choose');
    const selectedItemsCount = allOptionValue
        ? selectedItems.filter((item) => item.value !== allOptionValue).length
        : selectedItems.length;
    const displaySelectedCount = isApplyBtnVisible
        ? selectedItemsCount
        : selectedOptionsCount ?? selectedItems.length;

    return (
        <div className={selectClasses} style={rest.style}>
            {label && !hideLabel && <label htmlFor={id} className='select__label' {...getLabelProps()}>{label}</label>}
            <div className='select__wrapper'>
                <div className='select__trigger' {...getToggleButtonProps()}>
                    {selectedItems.length > 0 ? `${placeholder ?? t('global.chosen')} (${displaySelectedCount})` : placeholderValue}
                    <Icon label='Dropdown icon' size='medium' icon={<MdArrowDropDown color='#5D6071' />} />
                </div>

                <div className='select__menu select__menu--multiselect'>
                    <ul className='select__options' {...getMenuProps()}>
                        {isOpen &&
                            options.map((item, index) => (
                                <li
                                    key={`${item.label}-${index}`}
                                    className={clsx('select__option', { 'select__option--selected': highlightedIndex === index })}
                                    {...getItemProps({
                                        item,
                                        index,
                                    })}
                                >
                                    <input
                                        type='checkbox'
                                        checked={selectedItems.map((s) => s.value).includes(item.value)}
                                        value={item.value}
                                        onChange={() => null}
                                    />
                                    <span>{item.label}</span>
                                </li>
                            ))}
                    </ul>
                    {isOpen && isApplyBtnVisible && (
                        <div className='select__actions'>
                            <Button
                                size='s'
                                type='button'
                                onClick={applySelection}
                            >
                                {t('global.apply')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export default FormMultiselect;
