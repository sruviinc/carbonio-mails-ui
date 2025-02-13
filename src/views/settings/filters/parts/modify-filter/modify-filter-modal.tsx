/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, {
	FC,
	ReactElement,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState
} from 'react';

import { Checkbox, Container, Divider, Input, Padding, Row } from '@zextras/carbonio-design-system';
import { useUserSettings } from '@zextras/carbonio-shell-ui';
import { TFunction } from 'i18next';
import { findIndex, forEach, isEqual, map, omit, reduce } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import ModalHeader from '../../../../../carbonio-ui-commons/components/modals/modal-header';
import { useUiUtilities } from '../../../../../hooks/use-ui-utilities';
import { modifyFilterRules } from '../../../../../store/actions/modify-filter-rules';
import type { FilterActions } from '../../../../../types';
import { capitalise } from '../../../../sidebar/utils';
import { CreateFilterContext } from '../create-filter-context';
import ModalFooter from '../create-filter-modal-footer';
import DefaultCondition from '../create-filters-conditions/default';
import FilterTestConditionRow from '../filter-test-condition-row';
import { findRowKey, getTestComponent } from '../get-test-component';
import FilterActionConditions from '../new-filter-action-conditions';
import { getButtonInfo } from '../utils';

type FilterType = {
	active: boolean;
	filterActions: Array<any>;
	filterTests: Array<Record<string, any>>;
	id: string;
	name: string;
};
type ComponentProps = {
	t: TFunction;
	onClose: () => void;
	incomingFilters?: any;
	setFetchIncomingFilters: (arg: boolean) => void;
	setIncomingFilters: (arg: any) => void;
	selectedFilter: FilterType | any;
};

const ModifyFilterModal: FC<ComponentProps> = ({
	t,
	onClose,
	incomingFilters,
	setFetchIncomingFilters,
	setIncomingFilters,
	selectedFilter
}): ReactElement => {
	const [filterName, setFilterName] = useState('');
	const [activeFilter, setActiveFilter] = useState(false);
	const [condition, setCondition] = useState('anyof');
	const [dontProcessAddFilters, setDontProcessAddFilters] = useState(true);
	const [tempActions, setTempActions] = useState([{ actionKeep: [{}], id: uuidv4() }]);
	const [copyRequiredFilters, setCopyRequiredFilters] = useState({});
	const [reFetch, setReFetch] = useState(false);
	const [updateRequiredFilters, setUpdateRequiredFilters] = useState(true);
	const { zimbraFeatureMailForwardingInFiltersEnabled } = useUserSettings().attrs;
	const { createSnackbar } = useUiUtilities();

	const [newFilters, setNewFilters] = useState([
		{
			filterActions: [{ actionKeep: [{}], actionStop: [{}] }],
			active: activeFilter,
			name: filterName,
			key: 'subject',
			label: 'Subject',
			filterTests: [{}],
			index: 0,
			comp: <DefaultCondition t={t} activeIndex={0} />
		}
	]);

	const toggleActiveFilter = useCallback(() => setActiveFilter(!activeFilter), [activeFilter]);
	const onFilterNameChange = useCallback((ev) => setFilterName(ev.target.value), []);
	const modalTitle = useMemo(
		() => `${t('label.edit', 'Edit')} ${selectedFilter?.name}`,
		[t, selectedFilter?.name]
	);
	const inputLabel = useMemo(() => `${t('settings.filter_name', 'Filter Name')}*`, [t]);
	const activeFilterLabel = useMemo(() => t('settings.active_filter', 'Active filter'), [t]);

	const requiredFilterTest = useMemo(() => {
		const allTest = map(newFilters, (f) => f.filterTests[0]);

		return reduce(
			allTest,
			(a, i) => {
				const firstKey = Object.keys(omit(i, ['condition']))[0];
				if (Object.keys(a).includes(firstKey)) {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					return { ...a, [firstKey]: [...a[firstKey], ...i[firstKey]] };
				}
				return { ...a, ...i };
			},
			{}
		);
	}, [newFilters]);

	const finalActions = useMemo(
		() =>
			reduce(
				tempActions,
				(acc, i) => {
					const firstKey = Object.keys(omit(i, 'id'))[0];
					if (Object.keys(acc).includes(firstKey)) {
						const accWithoutId = omit(acc, 'id');
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						return { ...accWithoutId, [firstKey]: [...accWithoutId[firstKey], ...i[firstKey]] };
					}
					return { ...acc, ...i };
				},
				{}
			),
		[tempActions]
	);

	const requiredFilters = useMemo(
		() => ({
			filterActions: dontProcessAddFilters
				? ([{ ...omit(finalActions, 'id'), actionStop: [{}] }] as FilterActions[])
				: ([{ ...omit(finalActions, 'id') }] as FilterActions[]),
			active: activeFilter,
			name: filterName,
			filterTests: [
				{
					...requiredFilterTest,
					condition
				}
			]
		}),
		[activeFilter, filterName, condition, requiredFilterTest, dontProcessAddFilters, finalActions]
	);

	const [createFilterDisabled, buttonTooltip] = useMemo(() => {
		if (isEqual(copyRequiredFilters, requiredFilters)) {
			return [true, t('settings.label.not_changed_anything', 'No change was made')];
		}
		return getButtonInfo(filterName, requiredFilters, t, false);
	}, [copyRequiredFilters, filterName, requiredFilters, t]);

	const incomingFiltersCopy = useMemo(() => incomingFilters?.slice(), [incomingFilters]);

	const toggleCheckBox = useCallback(() => {
		setDontProcessAddFilters((prev) => !prev);
	}, []);

	useLayoutEffect(() => {
		setDontProcessAddFilters(!!selectedFilter.filterActions[0]?.actionStop);
	}, [selectedFilter.filterActions]);

	const filterActionProps = useMemo(
		() => ({
			t,
			activeFilter,
			filterName,
			isIncoming: true,
			tempActions,
			setTempActions,
			zimbraFeatureMailForwardingInFiltersEnabled
		}),
		[t, activeFilter, filterName, tempActions, zimbraFeatureMailForwardingInFiltersEnabled]
	);
	const filterTestConditionRowProps = useMemo(
		() => ({
			t,
			newFilters,
			setNewFilters,
			condition,
			setCondition,
			activeFilter,
			filterName,
			selectedFilter
		}),
		[
			t,
			newFilters,
			setNewFilters,
			condition,
			setCondition,
			activeFilter,
			filterName,
			selectedFilter
		]
	);

	useEffect(() => {
		if (selectedFilter) {
			setFilterName(selectedFilter?.name);
			setActiveFilter(selectedFilter?.active);
			setCondition(selectedFilter?.filterTests?.[0]?.condition);
			const previousActions = (): Array<any> => {
				const actions: Array<any> = [];
				forEach(selectedFilter?.filterActions?.[0], (value, key) => {
					if (key !== 'actionStop') {
						forEach(value, (val) => {
							actions.push({ [key]: [{ ...omit(val, 'index') }], id: uuidv4() });
						});
					}
				});
				return actions;
			};
			setTempActions(previousActions);
		}
	}, [selectedFilter]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const setCopyOfFilter = (): void => {
		setCopyRequiredFilters(requiredFilters);
	};
	useEffect(() => {
		if (selectedFilter) {
			if (updateRequiredFilters) {
				setTimeout(() => {
					setUpdateRequiredFilters(false);
					setCopyOfFilter();
				}, 10);
			}
		}
	}, [selectedFilter, setCopyOfFilter, updateRequiredFilters]);

	const previousFilterTests = useMemo(() => {
		const tempTests: Array<any> = [];
		forEach(selectedFilter?.filterTests?.[0], (value, key) => {
			if (key !== 'condition') {
				map(value, (test) => {
					tempTests.push({ ...test, testName: key });
				});
			}
		});
		return tempTests;
	}, [selectedFilter]);

	const modifiedNewFilters = useMemo(
		() =>
			map(previousFilterTests, (test, index) => {
				if (index === previousFilterTests.length - 1) setReFetch(true);
				return {
					filterActions: [{ actionKeep: [{}], actionStop: [{}] }],
					active: false,
					name: '',
					key: findRowKey({ name: test.testName, test }),
					label: capitalise(findRowKey({ name: test.testName, test })),
					filterTests: [
						{
							...{ [test.testName]: [test] },
							condition: selectedFilter?.filterTests?.[0]?.condition
						}
					],
					index: 0,
					comp: getTestComponent({
						name: test.testName,
						test: { [test.testName]: [test] },
						index,
						t
					})
				};
			}),

		[previousFilterTests, t, selectedFilter]
	);

	useEffect(() => {
		setNewFilters(modifiedNewFilters);
		if (reFetch) setReFetch(false);
	}, [modifiedNewFilters, reFetch]);

	const onConfirm = useCallback(() => {
		const selectedFilterIndex = findIndex(
			incomingFiltersCopy,
			(filterCopy: any) => filterCopy.name === selectedFilter?.name
		);
		const toSend = incomingFiltersCopy.slice();
		toSend[selectedFilterIndex] = requiredFilters;
		setIncomingFilters(toSend);

		modifyFilterRules(toSend)
			.then(() => {
				setFetchIncomingFilters(true);
				createSnackbar({
					key: `share`,
					replace: true,
					hideButton: true,
					type: 'info',
					label: t('label.filter_modified', 'Filter modified succesfully'),
					autoHideTimeout: 5000
				});
			})
			.catch((error) => {
				createSnackbar({
					key: `share`,
					replace: true,
					hideButton: true,
					type: 'error',
					label:
						error?.message || t('label.error_try_again', 'Something went wrong, please try again'),
					autoHideTimeout: 5000
				});
			});
		onClose();
	}, [
		incomingFiltersCopy,
		requiredFilters,
		setIncomingFilters,
		onClose,
		selectedFilter?.name,
		setFetchIncomingFilters,
		createSnackbar,
		t
	]);

	return (
		<CreateFilterContext.Provider value={{ newFilters, setNewFilters }}>
			<Container
				padding={{ bottom: 'medium' }}
				crossAlignment="flex-start"
				mainAlignment="flex-start"
				maxHeight="100%"
				style={{ overflowY: 'scroll', overflowX: 'hidden' }}
			>
				<ModalHeader title={modalTitle} onClose={onClose} />
				<Input
					label={inputLabel}
					value={filterName}
					onChange={onFilterNameChange}
					backgroundColor="gray5"
				/>
				<Padding top="small" />
				<Checkbox value={activeFilter} onClick={toggleActiveFilter} label={activeFilterLabel} />
				<Row
					padding={{ vertical: 'medium' }}
					height="fit"
					maxHeight="100%"
					crossAlignment="flex-start"
					mainAlignment="flex-start"
					style={{ overflowY: 'scroll' }}
					display="block"
					maxWidth="100%"
					width="100%"
				>
					<FilterTestConditionRow compProps={filterTestConditionRowProps} />
					<Padding top="medium" />
					<Divider />
					<FilterActionConditions compProps={filterActionProps} />
				</Row>
				<ModalFooter
					label={t('label.save', 'Save')}
					toolTipText={buttonTooltip}
					onConfirm={onConfirm}
					disabled={createFilterDisabled}
					onSecondaryAction={toggleCheckBox}
					checked={dontProcessAddFilters}
					checkboxLabel={t(
						'settings.do_not_process_additional_filters',
						'Do not process additional filters'
					)}
				/>
			</Container>
		</CreateFilterContext.Provider>
	);
};

export default ModifyFilterModal;
