import React, { FunctionComponent, useState } from 'react';
import { List, ListItem, ListItemIcon, ListItemSecondaryAction, ListItemText } from '@mui/material';
import { makeStyles } from '@mui/styles';
import * as R from 'ramda';
import type { Theme } from '../../../../../components/Theme';
import InjectAddExpectation from './InjectAddExpectation';
import { useFormatter } from '../../../../../components/i18n';
import { truncate } from '../../../../../utils/String';
import ExpectationPopover from './ExpectationPopover';
import type { ExpectationInput } from './Expectation';
import { isAutomatic, typeIcon } from './ExpectationUtils';

const useStyles = makeStyles((theme: Theme) => ({
  item: {
    paddingLeft: 10,
    height: 50,
  },
  column: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
  },
  bodyItem: {
    fontSize: theme.typography.h3.fontSize,
  },
}));

interface InjectExpectationsProps {
  predefinedExpectationDatas: ExpectationInput[];
  expectationDatas: ExpectationInput[];
  handleExpectations: (expectations: ExpectationInput[]) => void;
}

const InjectExpectations: FunctionComponent<InjectExpectationsProps> = ({
  predefinedExpectationDatas,
  expectationDatas,
  handleExpectations,
}) => {
  // Standard hooks
  const classes = useStyles();
  const { t } = useFormatter();

  const [expectations, setExpectations] = useState(expectationDatas ?? []);

  const predefinedExpectations = predefinedExpectationDatas
    .filter((pe) => !expectations.map((e) => e.expectation_type).includes(pe.expectation_type));

  // -- SORT HEADERS --

  const [sortBy] = useState('expectation_name');
  const [sortAsc] = useState(true);

  const sortExpectations = R.sortWith(
    sortAsc
      ? [R.ascend(R.prop(sortBy))]
      : [R.descend(R.prop(sortBy))],
  );
  const sortedExpectations: ExpectationInput[] = sortExpectations(expectations);

  // -- ACTIONS --

  const handleAddExpectation = (expectation: ExpectationInput) => {
    const values = [...sortedExpectations, expectation];
    setExpectations(values);
    handleExpectations(values);
  };

  const handleUpdateExpectation = (expectation: ExpectationInput, idx: number) => {
    const values = sortedExpectations.map((item, i) => (i !== idx ? item : expectation));
    setExpectations(values);
    handleExpectations(values);
  };

  const handleRemoveExpectation = (idx: number) => {
    const values = sortedExpectations.filter((_, i) => i !== idx);
    setExpectations(values);
    handleExpectations(values);
  };

  // -- UTILS --

  const typeLabel = (type: string) => {
    if (isAutomatic(type)) {
      return t('Automatic');
    }
    return t('Manual');
  };

  return (
    <>
      <List>
        {sortedExpectations.map((expectation, idx) => (
          <ListItem
            key={expectation.expectation_name}
            classes={{ root: classes.item }}
            divider={true}
          >
            <ListItemIcon>
              {typeIcon(expectation.expectation_type)}
            </ListItemIcon>
            <ListItemText
              primary={
                <div className={classes.column}>
                  <div className={classes.bodyItem}>
                    {truncate(expectation.expectation_name || '', 40)}
                  </div>
                  <div className={classes.bodyItem}>
                    {truncate(expectation.expectation_description || '', 15)}
                  </div>
                  <div className={classes.bodyItem}>
                    {expectation.expectation_score}
                  </div>
                  <div className={classes.bodyItem}>
                    {typeLabel(expectation.expectation_type)}
                  </div>
                </div>
              }
            />
            <ListItemSecondaryAction>
              <ExpectationPopover
                index={idx}
                expectation={expectation}
                handleUpdate={handleUpdateExpectation}
                handleDelete={handleRemoveExpectation}
              />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
      <InjectAddExpectation
        handleAddExpectation={handleAddExpectation}
        predefinedExpectations={predefinedExpectations}
      />
    </>
  );
};

export default InjectExpectations;
