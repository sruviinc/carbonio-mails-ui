/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { SyntheticEvent, useMemo } from 'react';

import { useModal } from '@zextras/carbonio-design-system';
import { FOLDERS, t, useAppContext } from '@zextras/carbonio-shell-ui';
import { noop, startsWith } from 'lodash';

import { DeleteModal } from './delete-modal';
import { EditModal } from './edit-modal';
import { EmptyModal } from './empty-modal';
import { NewModal } from './new-modal';
import { SharesInfoModal } from './shares-info-modal';
import { FolderActionsType } from '../../carbonio-ui-commons/constants/folders';
import type { Folder } from '../../carbonio-ui-commons/types/folder';
import { allowedActionOnSharedAccount } from '../../carbonio-ui-commons/utils/utils';
import { getFolderIdParts } from '../../helpers/folders';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { useSelection } from '../../hooks/use-selection';
import { useUiUtilities } from '../../hooks/use-ui-utilities';
import { folderAction } from '../../store/actions/folder-action';
import { selectMessagesArray } from '../../store/messages-slice';
import { StoreProvider } from '../../store/redux';
import { AppContext } from '../../types';
import { SelectFolderModal } from '../../ui-actions/modals/select-folder-modal';
import MoveConvMessage from '../../ui-actions/move-conv-msg';

type FolderActionsProps = {
	id: string;
	icon: string;
	label: string;
	onClick: (e: SyntheticEvent<HTMLElement, Event> | KeyboardEvent) => void;
	disabled?: boolean;
};

export const useFolderActions = (folder: Folder): Array<FolderActionsProps> => {
	const dispatch = useAppDispatch();
	// eslint-disable-next-line @typescript-eslint/ban-types
	const createModal = useModal();
	const folderIsTrash = getFolderIdParts(folder.id ?? '0').id === FOLDERS.TRASH;
	const messages = useAppSelector(selectMessagesArray);
	const trashMessages = messages.filter(
		(message) => getFolderIdParts(message.parent).id === FOLDERS.TRASH
	);
	const moveMessagesIds = useMemo(
		() => trashMessages.map((message) => message.id),
		[trashMessages]
	);
	const { setCount } = useAppContext<AppContext>();

	const { deselectAll } = useSelection({ currentFolderId: folder.id, setCount, count: 0 });

	const { createSnackbar } = useUiUtilities();

	const actions = useMemo(
		() => [
			{
				id: FolderActionsType.NEW,
				'data-testid': `folder-action-${FolderActionsType.NEW}`,
				icon: 'FolderAddOutline',
				label: t('label.new_folder', 'New Folder'),
				onClick: (e: SyntheticEvent<HTMLElement, Event> | KeyboardEvent): void => {
					if (e) {
						e.stopPropagation();
					}
					const closeModal = createModal(
						{
							maxHeight: '90vh',
							size: 'medium',
							children: (
								<StoreProvider>
									<NewModal folder={folder} onClose={(): void => closeModal()} />
								</StoreProvider>
							)
						},
						true
					);
				},
				tooltipLabel: !allowedActionOnSharedAccount(folder, FolderActionsType.NEW)
					? t('label.do_not_have_perm', `You don't have permission`)
					: '',
				disabled: !allowedActionOnSharedAccount(folder, FolderActionsType.NEW)
			},
			{
				id: FolderActionsType.MOVE,
				'data-testid': `folder-action-${FolderActionsType.MOVE}`,
				icon: folderIsTrash ? 'RestoreOutline' : 'MoveOutline',
				label: folderIsTrash ? t('label.restore', 'Restore') : t('label.move', 'Move'),
				onClick: (e: SyntheticEvent<HTMLElement, Event> | KeyboardEvent): void => {
					if (e) {
						e.stopPropagation();
					}

					if (folderIsTrash) {
						const closeModal = createModal(
							{
								maxHeight: '90vh',
								size: 'medium',
								children: (
									<StoreProvider>
										<MoveConvMessage
											folderId={folder.id}
											selectedIDs={moveMessagesIds}
											// TODO: Fix it in DS
											// eslint-disable-next-line @typescript-eslint/ban-ts-comment
											// @ts-ignore
											onClose={(): void => closeModal()}
											isMessageView
											isRestore
											deselectAll={deselectAll}
											dispatch={dispatch}
										/>
									</StoreProvider>
								)
							},
							true
						);
					} else {
						const inputLabel = t(
							'folder_panel.modal.move.body.message1',
							'Select a folder to move the considered one to:'
						);
						const confirmAction = (
							folderDestination: Folder | undefined,
							setFolderDestination: (_folder: Folder | undefined) => void,
							onClose: () => void
						): void => {
							const restoreFolder = (): Promise<void> =>
								folderAction({ folder, l: folder.l, op: 'move' }).then((res) => {
									if (!('Fault' in res)) {
										createSnackbar({
											key: `move-folder`,
											replace: true,
											type: 'success',
											label: t('messages.snackbar.folder_restored', 'Folder restored'),
											autoHideTimeout: 3000,
											hideButton: true
										});
									} else {
										createSnackbar({
											key: `move`,
											replace: true,
											type: 'error',
											label: t('label.error_try_again', 'Something went wrong, please try again'),
											autoHideTimeout: 3000,
											hideButton: true
										});
									}
								});
							folderAction({
								folder,
								l: folderDestination?.id ?? FOLDERS.USER_ROOT,
								op: 'move'
							})
								.then((res) => {
									if (!('Fault' in res)) {
										createSnackbar({
											key: `move`,
											replace: true,
											type: 'success',
											label: t('messages.snackbar.folder_moved', 'Folder successfully moved'),
											autoHideTimeout: 5000,
											hideButton: false,
											actionLabel: t('label.undo', 'Undo'),
											onActionClick: () => restoreFolder()
										});
									} else {
										createSnackbar({
											key: `move`,
											replace: true,
											type: 'error',
											label: t('label.error_try_again', 'Something went wrong, please try again.'),
											autoHideTimeout: 3000
										});
									}
									setFolderDestination(undefined);
									onClose();
								})
								.catch(() => noop);
						};
						const closeModal = createModal(
							{
								maxHeight: '90vh',
								size: 'medium',
								children: (
									<StoreProvider>
										<SelectFolderModal
											folder={folder}
											onClose={(): void => closeModal()}
											headerTitle={`${t('label.move', 'Move')} ${folder?.name}`}
											actionLabel={t('label.move', 'Move')}
											inputLabel={inputLabel}
											confirmAction={confirmAction}
											allowFolderCreation={false}
											allowRootSelection
											showSharedAccounts={false}
											showTrashFolder={false}
											showSpamFolder={false}
										/>
									</StoreProvider>
								)
							},
							true
						);
					}
				}
			},
			{
				id: FolderActionsType.EMPTY,
				'data-testid': `folder-action-${FolderActionsType.EMPTY}`,
				icon:
					getFolderIdParts(folder.id).id === FOLDERS.TRASH
						? 'DeletePermanentlyOutline'
						: 'EmptyFolderOutline',
				label:
					getFolderIdParts(folder.id).id === FOLDERS.TRASH
						? t('folder_panel.action.empty.trash', 'Empty Trash')
						: t('folder_panel.action.wipe.folder_panel', 'Wipe Folder'),
				disabled: folder.n === 0 && folder.children?.length === 0,
				onClick: (e: SyntheticEvent<HTMLElement, Event> | KeyboardEvent): void => {
					if (e) {
						e.stopPropagation();
					}
					const closeModal = createModal(
						{
							children: (
								<StoreProvider>
									<EmptyModal onClose={(): void => closeModal()} folder={folder} />
								</StoreProvider>
							)
						},
						true
					);
				}
			},
			{
				id: FolderActionsType.EDIT,
				'data-testid': `folder-action-${FolderActionsType.EDIT}`,
				icon: 'Edit2Outline',
				label: folder.isLink
					? t('folder_panel.action.edit_properties', 'Edit Properties')
					: t('label.edit', 'Edit'),
				onClick: (e: SyntheticEvent<HTMLElement, Event> | KeyboardEvent): void => {
					if (e) {
						e.stopPropagation();
					}
					const closeModal = createModal(
						{
							maxHeight: '90vh',
							children: (
								<StoreProvider>
									<EditModal onClose={(): void => closeModal()} folder={folder} />
								</StoreProvider>
							)
						},
						true
					);
				}
			},
			{
				id: FolderActionsType.DELETE,
				'data-testid': `folder-action-${FolderActionsType.DELETE}`,
				icon: 'Trash2Outline',
				label: startsWith(folder.absFolderPath, '/Trash')
					? t('label.delete_permanently', 'Delete Permanently')
					: t('label.delete', 'Delete'),
				onClick: (e: SyntheticEvent<HTMLElement, Event> | KeyboardEvent): void => {
					if (e) {
						e.stopPropagation();
					}
					const closeModal = createModal(
						{
							children: (
								<StoreProvider>
									<DeleteModal onClose={(): void => closeModal()} folder={folder} />
								</StoreProvider>
							)
						},
						true
					);
				}
			},
			{
				id: FolderActionsType.REMOVE_FROM_LIST,
				'data-testid': `folder-action-${FolderActionsType.REMOVE_FROM_LIST}`,
				icon: 'CloseOutline',
				label: t('label.remove_from_this_list', 'Remove from this list'),
				onClick: (e: SyntheticEvent<HTMLElement, Event> | KeyboardEvent): void => {
					if (e) {
						e.stopPropagation();
						folderAction({ folder, op: 'delete' });
					}
				}
			},
			{
				id: FolderActionsType.SHARES_INFO,
				'data-testid': `folder-action-${FolderActionsType.SHARES_INFO}`,
				icon: 'InfoOutline',
				label: t('label.shares_info', `Shared folder's info`),
				onClick: (e: SyntheticEvent<HTMLElement, Event> | KeyboardEvent): void => {
					if (e) {
						e.stopPropagation();
					}
					const closeModal = createModal(
						{
							children: (
								<StoreProvider>
									<SharesInfoModal onClose={(): void => closeModal()} folder={folder} />
								</StoreProvider>
							)
						},
						true
					);
				}
			},
			{
				id: FolderActionsType.MARK_ALL_READ,
				'data-testid': `folder-action-${FolderActionsType.MARK_ALL_READ}`,
				icon: 'EmailReadOutline',
				label: t('label.mark_all_as_read', 'Mark all as read'),
				onClick: (e: SyntheticEvent<HTMLElement, Event> | KeyboardEvent): void => {
					if (e) {
						e.stopPropagation();
						folderAction({ folder, op: 'read', l: folder.id });
					}
				}
			}
		],
		[createModal, createSnackbar, deselectAll, dispatch, folder, folderIsTrash, moveMessagesIds]
	);

	const defaultFolderActions = useMemo(
		() =>
			actions.filter(
				(action) =>
					action.id !== FolderActionsType.SHARES_INFO &&
					action.id !== FolderActionsType.REMOVE_FROM_LIST
			),
		[actions]
	);
	const id =
		folder.id.indexOf(':') !== -1 ? folder.id.slice(folder.id.indexOf(':') + 1) : folder.id;

	switch (id) {
		// default folders
		case FOLDERS.INBOX:
		case FOLDERS.SENT:
			//	case FOLDERS.DRAFTS:
			return defaultFolderActions.map((action) =>
				action.id === FolderActionsType.MOVE || action.id === FolderActionsType.DELETE
					? { ...action, disabled: true }
					: action
			);
		case FOLDERS.DRAFTS:
			return defaultFolderActions.map((action) =>
				action.id === FolderActionsType.MOVE ||
				action.id === FolderActionsType.DELETE ||
				action.id === FolderActionsType.MARK_ALL_READ
					? { ...action, disabled: true }
					: action
			);
		case FOLDERS.SPAM:
			return defaultFolderActions.map((action) =>
				action.id === FolderActionsType.NEW ||
				action.id === FolderActionsType.MOVE ||
				action.id === FolderActionsType.DELETE
					? { ...action, disabled: true }
					: action
			);
		case FOLDERS.TRASH:
			return defaultFolderActions.map((action) =>
				(action.id === FolderActionsType.MOVE && trashMessages.length === 0) ||
				action.id === FolderActionsType.DELETE ||
				action.id === FolderActionsType.EDIT
					? { ...action, disabled: true }
					: action
			);
		// customizable folders
		default:
			return folder.isLink
				? actions.filter(
						(action) =>
							action.id === FolderActionsType.SHARES_INFO ||
							action.id === FolderActionsType.REMOVE_FROM_LIST ||
							action.id === FolderActionsType.EDIT
					)
				: defaultFolderActions.map((action) => {
						if (
							startsWith(folder.absFolderPath, '/Trash') &&
							(action.id === FolderActionsType.NEW || action.id === FolderActionsType.EDIT)
						) {
							return { ...action, disabled: true };
						}
						return action;
					});
	}
};
