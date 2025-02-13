/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { FC, ReactElement, useCallback, useMemo, useState } from 'react';

import { Input, Padding, Text } from '@zextras/carbonio-design-system';
import { changeTagColor, createTag, renameTag, t } from '@zextras/carbonio-shell-ui';

import ModalFooter from '../../../../carbonio-ui-commons/components/modals/modal-footer';
import ModalHeader from '../../../../carbonio-ui-commons/components/modals/modal-header';
import type { CreateUpdateTagModalPropType } from '../../../../carbonio-ui-commons/types/sidebar';
import { useUiUtilities } from '../../../../hooks/use-ui-utilities';
import ColorPicker from '../../../../integrations/shared-invite-reply/parts/color-select';

const NonSupportedCharacters = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/;
const CreateUpdateTagModal: FC<CreateUpdateTagModalPropType> = ({
	onClose,
	editMode = false,
	tag
}): ReactElement => {
	const [name, setName] = useState(tag?.name || '');
	const [color, setColor] = useState(tag?.color || 0);
	const title = useMemo(
		() =>
			editMode
				? t('label.edit_tag_name', { name: tag?.name, defaultValue: 'Edit "{{name}}" tag' })
				: t('label.create_tag', 'Create a new Tag'),
		[editMode, tag?.name]
	);
	const label = useMemo(() => t('label.tag_name', 'Tag name'), []);
	const handleColorChange = useCallback((c: string | null) => setColor(c), []);
	const handleNameChange = useCallback((ev) => setName(ev.target.value), []);

	const showMaxLengthWarning = useMemo(() => name.length >= 128, [name]);
	const showSpecialCharWarning = useMemo(() => NonSupportedCharacters.test(name), [name]);

	const showWarning = useMemo(
		() => showMaxLengthWarning || showSpecialCharWarning,
		[showMaxLengthWarning, showSpecialCharWarning]
	);
	const disabled = useMemo(() => name === '' || showWarning, [name, showWarning]);

	const { createSnackbar } = useUiUtilities();

	const onCreate = useCallback(
		() =>
			createTag({ name, color }).then((res) => {
				if (res.tag) {
					createSnackbar({
						key: `new-tag`,
						replace: true,
						type: 'info',
						label: t('messages.snackbar.tag_created', {
							name,
							defaultValue: 'Tag {{name}} successfully created'
						}),
						autoHideTimeout: 3000,
						hideButton: true
					});
				}
				onClose();
			}),
		[name, color, onClose, createSnackbar]
	);
	const onUpdate = useCallback(() => {
		Promise.all([renameTag(`${tag?.id}`, name), changeTagColor(`${tag?.id}`, Number(color))])
			.then(() => {
				onClose();
				createSnackbar({
					key: `update-tag`,
					replace: true,
					type: 'info',
					label: t('messages.snackbar.tag_updated', 'Tag successfully updated'),
					autoHideTimeout: 3000,
					hideButton: true
				});
			})
			.catch(() => {
				onClose();
				createSnackbar({
					key: `update-tag-error`,
					replace: true,
					type: 'error',
					label: t(
						'messages.snackbar.tag_not_updated',
						'Something went wrong, tag not updated. Please try again.'
					),
					autoHideTimeout: 3000,
					hideButton: true
				});
			});
	}, [color, createSnackbar, name, onClose, tag?.id]);

	return (
		<>
			<ModalHeader onClose={onClose} title={title} />
			<Input
				label={label}
				value={name}
				onChange={handleNameChange}
				backgroundColor="gray5"
				textColor={showWarning ? 'error' : 'text'}
				hasError={showWarning}
			/>

			{showWarning && (
				<Padding all="small">
					{showMaxLengthWarning && (
						<Text size="extrasmall" color="error" overflow="break-word">
							{t('label.tag_max_length', 'Max 128 characters are allowed')}
						</Text>
					)}
					{showSpecialCharWarning && (
						<Text size="extrasmall" color="error" overflow="break-word">
							{t('label.no_special_char_allowed', 'Name should not contain any special character')}
						</Text>
					)}
				</Padding>
			)}

			<Padding top="small" />
			<ColorPicker
				onChange={handleColorChange}
				label={t('label.select_color', 'Select Color')}
				defaultColor={color}
			/>
			<ModalFooter
				onConfirm={editMode ? onUpdate : onCreate}
				label={editMode ? t('label.edit', 'edit') : t('label.create', 'Create')}
				disabled={disabled}
			/>
		</>
	);
};

export default CreateUpdateTagModal;
