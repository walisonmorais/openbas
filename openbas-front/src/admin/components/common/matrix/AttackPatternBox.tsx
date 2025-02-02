import { Link } from 'react-router-dom';
import { Button, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import React, { FunctionComponent, useState } from 'react';
import { makeStyles, useTheme } from '@mui/styles';
import type { AttackPattern, ExpectationResultsByType } from '../../../../utils/api-types';
import type { InjectExpectationResultsByAttackPatternStore, InjectExpectationResultsByTypeStore } from '../../../../actions/exercises/Exercise';
import type { Theme } from '../../../../components/Theme';
import AtomicTestingResult from '../../atomic_testings/atomic_testing/AtomicTestingResult';
import { hexToRGB } from '../../../../utils/Colors';

const useStyles = makeStyles((theme: Theme) => ({
  button: {
    whiteSpace: 'nowrap',
    width: '100%',
    textTransform: 'capitalize',
    color: theme.palette.text?.primary,
    backgroundColor: theme.palette.background.accent,
    borderRadius: 4,
    padding: '6px 0px 6px 8px',
  },
  buttonDummy: {
    whiteSpace: 'nowrap',
    width: '100%',
    textTransform: 'capitalize',
    color: theme.palette.text?.primary,
    backgroundColor: hexToRGB(theme.palette.background.accent, 0.4),
    borderRadius: 4,
    padding: '6px 0px 6px 8px',
  },
  buttonText: {
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    margin: 4,
    width: '100%',
  },
}));

interface AttackPatternBoxProps {
  goToLink?: string;
  attackPattern: AttackPattern;
  injectResult: InjectExpectationResultsByAttackPatternStore | undefined;
  dummy?: boolean;
}

const AttackPatternBox: FunctionComponent<AttackPatternBoxProps> = ({
  goToLink,
  attackPattern,
  injectResult,
  dummy,
}) => {
  // Standard hooks
  const classes = useStyles();
  const theme = useTheme<Theme>();
  const [open, setOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const results: InjectExpectationResultsByTypeStore[] = injectResult?.inject_expectation_results ?? [];
  if (results.length < 2) {
    const content = () => (
      <div className={classes.buttonText}>
        <Typography variant="caption" style={{ color: dummy ? theme.palette.text?.disabled : theme.palette.text?.primary }}>
          {attackPattern.attack_pattern_name}
        </Typography>
        <AtomicTestingResult expectations={results[0]?.results ?? []} />
      </div>
    );
    if (goToLink) {
      return (
        <Button
          key={attackPattern.attack_pattern_id}
          className={dummy ? classes.buttonDummy : classes.button}
          component={Link}
          to={goToLink ?? ''}
        >
          {content()}
        </Button>
      );
    }
    return (
      <div
        key={attackPattern.attack_pattern_id}
        className={dummy ? classes.buttonDummy : classes.button}
      >
        {content()}
      </div>
    );
  }
  const handleOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    setOpen(true);
    setAnchorEl(event.currentTarget);
  };
  const lowestSelector = (aggregation: (('FAILED' | 'PENDING' | 'PARTIAL' | 'UNKNOWN' | 'VALIDATED' | undefined)[])): 'FAILED' | 'PENDING' | 'PARTIAL' | 'UNKNOWN' | 'VALIDATED' => {
    if (aggregation.includes('FAILED')) {
      return 'FAILED';
    }
    if (aggregation.includes('PENDING')) {
      return 'PENDING';
    }
    if (aggregation.includes('UNKNOWN')) {
      return 'UNKNOWN';
    }
    return 'VALIDATED';
  };
  const aggregatedPrevention = (results ?? []).map((result) => result.results?.filter((r) => r.type === 'PREVENTION').map((r) => r.avgResult)).flat();
  const aggregatedDetection = (results ?? []).map((result) => result.results?.filter((r) => r.type === 'DETECTION').map((r) => r.avgResult)).flat();
  const aggregatedHumanResponse = (results ?? []).map((result) => result.results?.filter((r) => r.type === 'HUMAN_RESPONSE').map((r) => r.avgResult)).flat();
  const aggregatedResults : ExpectationResultsByType[] = [
    {
      type: 'PREVENTION',
      avgResult: lowestSelector(aggregatedPrevention),
      distribution: [],
    },
    {
      type: 'DETECTION',
      avgResult: lowestSelector(aggregatedDetection),
      distribution: [],
    },
    {
      type: 'HUMAN_RESPONSE',
      avgResult: lowestSelector(aggregatedHumanResponse),
      distribution: [],
    },
  ];
  return (
    <>
      <Button
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        className={classes.button}
        onClick={(event) => handleOpen(event)}
      >
        <div className={classes.buttonText}>
          <Typography variant="caption">
            {attackPattern.attack_pattern_name}
          </Typography>
          <AtomicTestingResult expectations={aggregatedResults} />
        </div>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => {
          setAnchorEl(null);
          setOpen(false);
        }}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top', horizontal: 'left',
        }}
      >
        {results?.map((result, idx) => {
          const content = () => (
            <>
              <ListItemText primary={result.inject_title} />
              <AtomicTestingResult expectations={result.results ?? []} />
            </>
          );
          if (goToLink) {
            return (
              <MenuItem
                key={`inject-result-${idx}`}
                component={Link}
                to={goToLink ?? ''}
                style={{ display: 'flex', gap: 8 }}
              >
                {content()}
              </MenuItem>
            );
          }
          return (
            <MenuItem
              key={`inject-result-${idx}`}
              style={{ display: 'flex', gap: 8, pointerEvents: 'none' }}
            >
              {content()}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default AttackPatternBox;
