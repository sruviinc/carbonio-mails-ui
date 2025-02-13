/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { ReactElement, useCallback, useContext, useMemo, useState } from 'react';

import {
	Checkbox,
	Icon,
	ModalManagerContext,
	Padding,
	Row,
	Text
} from '@zextras/carbonio-design-system';
import {
	Tag,
	ZIMBRA_STANDARD_COLORS,
	replaceHistory,
	t,
	useTags
} from '@zextras/carbonio-shell-ui';
import { every, find, includes, map, reduce, some } from 'lodash';

import DeleteTagModal from '../carbonio-ui-commons/components/tags/delete-tag-modal';
import { TagsActionsType } from '../carbonio-ui-commons/constants';
import { useAppDispatch } from '../hooks/redux';
import { useUiUtilities } from '../hooks/use-ui-utilities';
import { convAction, msgAction } from '../store/actions';
import { StoreProvider } from '../store/redux';
import type {
	ArgumentType,
	Conversation,
	ItemType,
	MailMessage,
	TagActionsReturnType,
	TagsFromStoreType
} from '../types';
import CreateUpdateTagModal from '../views/sidebar/parts/tags/create-update-tag-modal';

export const createTag = ({ createModal }: ArgumentType): TagActionsReturnType => ({
	id: TagsActionsType.NEW,
	icon: 'TagOutline',
	label: t('label.create_tag', 'Create Tag'),
	onClick: (e: React.SyntheticEvent<HTMLElement, Event> | KeyboardEvent): void => {
		if (e) {
			e.stopPropagation();
		}
		const closeModal =
			createModal &&
			createModal(
				{
					children: (
						<StoreProvider>
							<CreateUpdateTagModal onClose={(): void => closeModal && closeModal()} />
						</StoreProvider>
					)
				},
				true
			);
	}
});

export const editTag = ({ createModal, tag }: ArgumentType): TagActionsReturnType => ({
	id: TagsActionsType.EDIT,
	icon: 'Edit2Outline',
	label: t('label.edit_tag', 'Edit Tag'),
	onClick: (e: React.SyntheticEvent<HTMLElement, Event> | KeyboardEvent): void => {
		if (e) {
			e.stopPropagation();
		}
		const closeModal =
			createModal &&
			createModal(
				{
					children: (
						<StoreProvider>
							<CreateUpdateTagModal
								onClose={(): void => closeModal && closeModal()}
								tag={tag}
								editMode
							/>
						</StoreProvider>
					)
				},
				true
			);
	}
});

export const deleteTag = ({ createModal, tag }: ArgumentType): TagActionsReturnType => ({
	id: TagsActionsType.DELETE,
	icon: 'Untag',
	label: t('label.delete_tag', 'Delete Tag'),
	onClick: (e: React.SyntheticEvent<HTMLElement, Event> | KeyboardEvent): void => {
		if (e) {
			e.stopPropagation();
		}
		const closeModal =
			createModal &&
			createModal(
				{
					children: (
						<StoreProvider>
							<DeleteTagModal onClose={(): void => closeModal && closeModal()} tag={tag} />
						</StoreProvider>
					)
				},
				true
			);
	}
});

export const TagsDropdownItem = ({
	tag,
	conversation,
	isMessage
}: {
	tag: Tag;
	conversation: any;
	isMessage?: boolean;
}): ReactElement => {
	const { createSnackbar } = useUiUtilities();
	const dispatch = useAppDispatch();
	const [checked, setChecked] = useState(includes(conversation.tags, tag.id));
	const [isHovering, setIsHovering] = useState(false);
	const toggleCheck = useCallback(
		(value) => {
			setChecked((c) => !c);
			dispatch(
				isMessage
					? msgAction({
							operation: value ? '!tag' : 'tag',
							ids: [conversation.id],
							tagName: tag.name
						})
					: convAction({
							operation: value ? '!tag' : 'tag',
							ids: [conversation.id],
							tagName: tag.name
						})
			).then((res: any) => {
				if (res.type.includes('fulfilled')) {
					createSnackbar({
						key: `tag`,
						replace: true,
						hideButton: true,
						type: 'info',
						label: value
							? t('snackbar.tag_removed', { tag: tag.name, defaultValue: '"{{tag}}" tag removed' })
							: t('snackbar.tag_applied', {
									tag: tag.name,
									defaultValue: '"{{tag}}" tag applied'
								}),
						autoHideTimeout: 3000
					});
				} else {
					createSnackbar({
						key: `tag`,
						replace: true,
						type: 'error',
						label: t('label.error_try_again', 'Something went wrong, please try again'),
						autoHideTimeout: 3000,
						hideButton: true
					});
				}
			});
		},
		[conversation.id, createSnackbar, dispatch, isMessage, tag.name]
	);
	const tagColor = useMemo(() => ZIMBRA_STANDARD_COLORS[tag.color || 0].hex, [tag.color]);
	const tagIcon = useMemo(() => (checked ? 'Tag' : 'TagOutline'), [checked]);
	const tagIconOnHovered = useMemo(() => (checked ? 'Untag' : 'Tag'), [checked]);

	return (
		<Row
			data-testid={`tag-item-${tag.id}`}
			takeAvailableSpace
			mainAlignment="flex-start"
			onClick={(): void => toggleCheck(checked)}
			onMouseEnter={(): void => setIsHovering(true)}
			onMouseLeave={(): void => setIsHovering(false)}
		>
			<Padding right="small">
				<Checkbox value={checked} />
			</Padding>
			<Row takeAvailableSpace mainAlignment="space-between">
				<Row takeAvailableSpace mainAlignment="flex-start">
					<Text>{tag.name}</Text>
				</Row>
				<Row mainAlignment="flex-end">
					<Icon icon={isHovering ? tagIconOnHovered : tagIcon} color={tagColor} />
				</Row>
			</Row>
		</Row>
	);
};

export const MultiSelectTagsDropdownItem = ({
	tag,
	ids,
	tags,
	conversations,
	deselectAll,
	folderId,
	isMessage
}: {
	tag: ItemType;
	conversations: any;
	ids: string[];
	tags: Tag;
	multiSelect?: boolean;
	deselectAll?: () => void;
	folderId?: string;
	isMessage?: boolean;
}): ReactElement => {
	const { createSnackbar } = useUiUtilities();
	const dispatch = useAppDispatch();
	const [isHovering, setIsHovering] = useState(false);
	const tagsToShow = reduce(
		tags,
		(acc: any, v: any) => {
			const values = map(conversations, (c) => includes(c.tags, v.id));
			if (every(values)) acc.push(v.id);
			return acc;
		},
		[]
	);

	const [checked, setChecked] = useState(includes(tagsToShow, tag.id));
	const toggleCheck = useCallback(
		(value) => {
			setChecked((c) => !c);
			dispatch(
				isMessage
					? msgAction({
							operation: value ? '!tag' : 'tag',
							ids,
							tagName: tag.name
						})
					: convAction({
							operation: value ? '!tag' : 'tag',
							ids,
							tagName: tag.name
						})
			).then((res: any) => {
				if (res.type.includes('fulfilled')) {
					deselectAll && deselectAll();
					replaceHistory(`/folder/${folderId}/`);
					createSnackbar({
						key: `tag`,
						replace: true,
						hideButton: true,
						type: 'info',
						label: value
							? t('snackbar.tag_removed', { tag: tag.name, defaultValue: '"{{tag}}" tag removed' })
							: t('snackbar.tag_applied', {
									tag: tag.name,
									defaultValue: '"{{tag}}" tag applied'
								}),
						autoHideTimeout: 3000
					});
				} else {
					createSnackbar({
						key: `tag`,
						replace: true,
						type: 'error',
						label: t('label.error_try_again', 'Something went wrong, please try again'),
						autoHideTimeout: 3000,
						hideButton: true
					});
				}
			});
		},
		[dispatch, isMessage, ids, tag.name, deselectAll, folderId, createSnackbar]
	);

	const tagIcon = useMemo(() => (checked ? 'Tag' : 'TagOutline'), [checked]);
	const tagIconOnHovered = useMemo(() => (checked ? 'Untag' : 'Tag'), [checked]);
	const tagColor = useMemo(() => ZIMBRA_STANDARD_COLORS[tag.color || 0].hex, [tag.color]);
	return (
		<Row
			takeAvailableSpace
			mainAlignment="flex-start"
			onMouseEnter={(): void => setIsHovering(true)}
			onMouseLeave={(): void => setIsHovering(false)}
			onClick={(): void => toggleCheck(checked)}
		>
			<Padding right="small">
				<Checkbox value={checked} />
			</Padding>
			<Row takeAvailableSpace mainAlignment="space-between">
				<Row takeAvailableSpace mainAlignment="flex-start">
					<Text>{tag.name}</Text>
				</Row>
				<Row mainAlignment="flex-end">
					<Icon icon={isHovering ? tagIconOnHovered : tagIcon} color={tagColor} />
				</Row>
			</Row>
		</Row>
	);
};

export const applyMultiTag = ({
	tags,
	ids,
	conversations,
	deselectAll,
	folderId,
	isMessage
}: {
	conversations: any;
	tags: any;
	ids: string[];
	deselectAll?: () => void;
	folderId?: string;
	isMessage?: boolean;
}): { id: string; items: ItemType[]; customComponent: ReactElement } => {
	const tagItem = reduce(
		tags,
		(acc, v) => {
			const item = {
				id: v.id,
				label: v.name,
				icon: 'TagOutline',
				keepOpen: true,
				customComponent: (
					<MultiSelectTagsDropdownItem
						tag={v}
						tags={tags}
						ids={ids}
						conversations={conversations}
						deselectAll={deselectAll}
						folderId={folderId}
						isMessage={isMessage ?? false}
					/>
				)
			};
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			acc.push(item);
			return acc;
		},
		[]
	);

	return {
		id: TagsActionsType.Apply,
		items: tagItem,
		customComponent: (
			<Row takeAvailableSpace mainAlignment="flex-start">
				<Padding right="small">
					<Icon icon="TagsMoreOutline" />
				</Padding>
				<Row takeAvailableSpace mainAlignment="space-between">
					<Padding right="small">
						<Text>{t('label.tags', 'Tags')}</Text>
					</Padding>
				</Row>
			</Row>
		)
	};
};
export const applyTag = ({
	conversation,
	tags,
	isMessage
}: {
	conversation: Conversation | MailMessage;
	tags: TagsFromStoreType;
	isMessage?: boolean;
}): {
	id: string;
	items: ItemType[];
	customComponent: ReactElement;
	label?: string;
	icon?: string;
} => {
	const tagItem = reduce(
		tags,
		(acc: Array<ItemType>, v) => {
			const item = {
				id: v.id,
				label: v.name,
				icon: 'TagOutline',
				keepOpen: true,
				customComponent: (
					<TagsDropdownItem tag={v} conversation={conversation} isMessage={isMessage ?? false} />
				)
			};
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			acc.push(item);
			return acc;
		},
		[]
	);

	return {
		id: TagsActionsType.Apply,
		items: tagItem,
		label: t('label.tag', 'Tag'),
		icon: 'TagsMoreOutline',
		customComponent: (
			<Row takeAvailableSpace mainAlignment="flex-start">
				<Padding right="small">
					<Icon icon="TagsMoreOutline" />
				</Padding>
				<Row takeAvailableSpace mainAlignment="space-between">
					<Padding right="small">
						<Text>{t('label.tags', 'Tags')}</Text>
					</Padding>
				</Row>
			</Row>
		)
	};
};

export const useGetTagsActions = ({ tag }: ArgumentType): Array<TagActionsReturnType> => {
	const createModal = useContext(ModalManagerContext) as () => () => void;
	return useMemo(
		() => [
			createTag({ createModal }),
			editTag({ createModal, tag }),
			deleteTag({ tag, createModal })
		],
		[createModal, tag]
	);
};

export const useTagsArrayFromStore = (): Array<ItemType> => {
	const tagsFromStore = useTags();
	return useMemo(
		() =>
			reduce(
				tagsFromStore,
				(acc: Array<ItemType>, v: any) => {
					acc.push(v);
					return acc;
				},
				[]
			),
		[tagsFromStore]
	);
};

export const useTagExist = (tags: Array<Tag>): boolean => {
	const tagsArrayFromStore = useTagsArrayFromStore();

	return useMemo(
		() =>
			reduce(
				tags,
				(acc: boolean, v: Tag) => {
					let tmp = false;
					if (
						find(tagsArrayFromStore, { id: v?.id }) ||
						(tags?.length > 0 && some(tags, (tag) => tag.id.includes('nil:')))
					)
						tmp = true;
					return tmp;
				},
				false
			),
		[tags, tagsArrayFromStore]
	);
};
