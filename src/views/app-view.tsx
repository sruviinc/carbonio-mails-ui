/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { FC, Suspense, lazy, useEffect, useMemo, useState } from 'react';

import { Container } from '@zextras/carbonio-design-system';
import { FOLDERS, Spinner, setAppContext, useUserSettings } from '@zextras/carbonio-shell-ui';
import { includes } from 'lodash';
import moment from 'moment';
import { Redirect, Route, Switch, useParams, useRouteMatch } from 'react-router-dom';

import { getFolderIdParts } from '../helpers/folders';
import { useAppSelector } from '../hooks/redux';
import { selectCurrentFolder } from '../store/conversations-slice';
import { Modal, Typography } from '@mui/material';
import { Mail } from '@mui/icons-material';

const LazyFolderView = lazy(
	() => import(/* webpackChunkName: "folder-panel-view" */ './app/folder-panel')
);

const LazyDetailPanel = lazy(
	() => import(/* webpackChunkName: "folder-panel-view" */ './app/detail-panel')
);

const AppView: FC = () => {
	const { path } = useRouteMatch();
	const [count, setCount] = useState(0);
	const { zimbraPrefGroupMailBy, zimbraPrefLocale } = useUserSettings().prefs;
	const currentFolderId = useAppSelector(selectCurrentFolder);

	const isMessageView = useMemo(
		() =>
			(zimbraPrefGroupMailBy && zimbraPrefGroupMailBy === 'message') ||
			includes([FOLDERS.DRAFTS, FOLDERS.TRASH], getFolderIdParts(currentFolderId).id),
		[currentFolderId, zimbraPrefGroupMailBy]
	);

	if (zimbraPrefLocale) {
		moment.locale(zimbraPrefLocale as string);
	}

	useEffect(() => {
		setAppContext({ isMessageView, count, setCount });
	}, [count, isMessageView]);

	return (
		<div style={{ width: '100%', height: '100%' }}>
			<div style={{ padding: '16px', height: '72px' }}>
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					<Mail />
					<Typography variant="body1" style={{ marginLeft: '16px' }}>
						E-Mail
					</Typography>
				</div>
			</div>
			<div style={{ width: '100%', height: 'calc(100% - 72px)' }}>
				<Container orientation="horizontal" mainAlignment="flex-start">
					<Container width="40%">
						<Switch>
							<Route path={`${path}/folder/:folderId/:type?/:itemId?`}>
								<Suspense fallback={<Spinner />}>
									<LazyFolderView />
								</Suspense>
							</Route>
							<Redirect strict from={path} to={`${path}/folder/2`} />
						</Switch>
					</Container>

					<Container width="60%">
						<Suspense fallback={<Spinner />}>
							<LazyDetailPanel />
						</Suspense>
					</Container>
				</Container>
			</div>
		</div>
	);
};

export default AppView;
