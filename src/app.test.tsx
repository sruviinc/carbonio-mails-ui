/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React from 'react';

import * as shellUi from '@zextras/carbonio-shell-ui';
import { act } from 'react-dom/test-utils';

import App from './app';
import * as addComponentsToShell from './app-utils/add-shell-components';
import * as registerShellActions from './app-utils/register-shell-actions';
import * as registerShellIntegrations from './app-utils/register-shell-integrations';
import * as toggleBackupSearch from './app-utils/toggle-backup-search-component';
import * as useFoldersController from './carbonio-ui-commons/hooks/use-folders-controller';
import { setupTest } from './carbonio-ui-commons/test/test-setup';
import { useBackupSearchStore } from './store/zustand/backup-search/store';
import { DeletedMessageFromAPI } from './types';
import { BACKUP_SEARCH_ROUTE } from './constants';

function aDeletedMessage(): DeletedMessageFromAPI {
	return {
		messageId: '1',
		folderId: 'folder 1',
		owner: 'francesco',
		creationDate: '2024-03-01T12:00:00Z',
		deletionDate: '2024-06-12T12:00:00Z',
		subject: 'subject',
		sender: 'francesco@example.com',
		to: 'giuliano@example.com',
		fragment: 'Lorem ipsum dolor, sit amet consectetur adipisicing elit. Aliquid repellat officia'
	};
}

function updateBackupSearchStoreWith(messages: DeletedMessageFromAPI[]): void {
	act(() => {
		useBackupSearchStore.getState().setMessages(messages);
	});
}

describe('App', () => {
	const removeRouteSpy = jest.spyOn(shellUi, 'removeRoute');
	const addRouteSpy = jest.spyOn(shellUi, 'addRoute');

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should register a "mails" route accessible from the primary bar with specific position, name and icon', () => {
		const useFoldersControllerSpy = jest.spyOn(useFoldersController, 'useFoldersController');
		const addComponentsToShellSpy = jest.spyOn(addComponentsToShell, 'addComponentsToShell');
		const registerShellActionSpy = jest.spyOn(registerShellActions, 'registerShellActions');
		const registerShellIntegrationsSpy = jest.spyOn(
			registerShellIntegrations,
			'registerShellIntegrations'
		);
		setupTest(<App />);
		expect(addComponentsToShellSpy).toHaveBeenCalled();
		expect(registerShellActionSpy).toHaveBeenCalled();
		expect(registerShellIntegrationsSpy).toHaveBeenCalled();
		expect(useFoldersControllerSpy).toHaveBeenCalledWith('message');
	});

	it('should add the backup search route when the backup search messages are present', () => {
		updateBackupSearchStoreWith([aDeletedMessage()]);

		setupTest(<App />);

		expect(addRouteSpy).toHaveBeenCalledWith(
			expect.objectContaining({ route: BACKUP_SEARCH_ROUTE })
		);
	});

	it('should remove the backup search route when the backup search messages is present', () => {
		updateBackupSearchStoreWith([aDeletedMessage()]);

		setupTest(<App />);
		updateBackupSearchStoreWith([]);

		expect(removeRouteSpy).toHaveBeenCalledWith(BACKUP_SEARCH_ROUTE);
	});
});
