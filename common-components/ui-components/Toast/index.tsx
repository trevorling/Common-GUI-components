import React, { FC, useState } from 'react';
import * as RadixToast from '@radix-ui/react-toast';
import { MdCheck, MdFlag, MdInfo, MdOutlineClose, MdWarning } from 'react-icons/md';
import clsx from 'clsx';

import { Icon } from '../';
import type { ToastType } from '../../context/ToastContext';
import './Toast.scss';

type ToastProps = {
    toast: ToastType;
    close: () => void;
};

const toastIcons = {
    info: <MdInfo />,
    success: <MdCheck />,
    warning: <MdFlag />,
    error: <MdWarning />,
};

const Toast: FC<ToastProps> = ({ toast, close }) => {
    const [open, setOpen] = useState(true);

    const toastClasses = clsx('toast', `toast--${toast.type}`);

    return (
        <RadixToast.Root
            className={toastClasses}
            onEscapeKeyDown={close}
            open={open}
            onOpenChange={setOpen}
        >
            <Icon icon={toastIcons[toast.type]} />
            <div className="toast__body">
                <RadixToast.Title className="toast__title h6">
                    {toast.title}
                    {toast.message ? ':' : ''}
                </RadixToast.Title>
                {toast.message && (
                    <RadixToast.Description className="toast__content">
                        {toast.message}
                    </RadixToast.Description>
                )}
            </div>
            <RadixToast.Close onClick={close} className="toast__close">
                <Icon icon={<MdOutlineClose />} size="small" />
            </RadixToast.Close>
        </RadixToast.Root>
    );
};

export default Toast;
