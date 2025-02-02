import React, { FunctionComponent, useState } from 'react';
import { IconButton, List, ListItem, ListItemIcon, ListItemSecondaryAction, ListItemText } from '@mui/material';
import { Link } from 'react-router-dom';
import { DeleteOutlined, VideoSettingsOutlined } from '@mui/icons-material';
import { makeStyles } from '@mui/styles';
import DryrunStatus from '../controls/DryrunStatus';
import Empty from '../../../../../components/Empty';
import { useFormatter } from '../../../../../components/i18n';
import { useHelper } from '../../../../../store';
import useDataLoader from '../../../../../utils/hooks/useDataLoader';
import { deleteDryrun, fetchDryruns } from '../../../../../actions/Dryrun';
import type { ExerciseStore } from '../../../../../actions/exercises/Exercise';
import { useAppDispatch } from '../../../../../utils/hooks';
import type { DryRunHelper } from '../../../../../actions/dryruns/dryrun-helper';
import type { Dryrun } from '../../../../../utils/api-types';
import { usePermissions } from '../../../../../utils/Exercise';
import DialogDelete from '../../../../../components/common/DialogDelete';

const useStyles = makeStyles(() => ({
  item: {
    height: 50,
  },
  bodyContainer: {
    display: 'flex',
  },
  bodyItem: {
    lineHeight: '25px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

interface Props {
  exercise: ExerciseStore;
}

const ExerciseControlDryRuns: FunctionComponent<Props> = ({
  exercise,
}) => {
  // Standard hooks
  const { t, nsd } = useFormatter();
  const classes = useStyles();
  const dispatch = useAppDispatch();

  // Fetching data
  const { dryruns } = useHelper((helper: DryRunHelper) => {
    const dry = helper.getExerciseDryruns(exercise.exercise_id);
    return { dryruns: dry };
  });
  useDataLoader(() => {
    dispatch(fetchDryruns(exercise.exercise_id));
  });

  const permissions = usePermissions(exercise.exercise_id);
  const [openDryrunDelete, setOpenDryrunDelete] = useState<string | null>(null);

  const submitDryrunDelete = () => {
    dispatch(deleteDryrun(exercise.exercise_id, openDryrunDelete));
    setOpenDryrunDelete(null);
  };

  return (
    <>
      {dryruns.length > 0 ? (
        <List style={{ paddingTop: 0 }}>
          {dryruns.map((dryrun: Dryrun) => (
            <ListItem
              key={dryrun.dryrun_id}
              dense
              button
              classes={{ root: classes.item }}
              divider
              component={Link}
              to={`/admin/exercises/${exercise.exercise_id}/controls/dryruns/${dryrun.dryrun_id}`}
            >
              <ListItemIcon>
                <VideoSettingsOutlined />
              </ListItemIcon>
              <ListItemText
                primary={
                  <div className={classes.bodyContainer}>
                    <div
                      className={classes.bodyItem}
                      style={{ width: '30%' }}
                    >
                      {dryrun.dryrun_name}
                    </div>
                    <div
                      className={classes.bodyItem}
                      style={{ width: '15%' }}
                    >
                      {nsd(dryrun.dryrun_date)}
                    </div>
                    <div
                      className={classes.bodyItem}
                      style={{ width: '15%' }}
                    >
                      <code>{dryrun.dryrun_speed}x</code>
                    </div>
                    <div
                      className={classes.bodyItem}
                      style={{ width: '20%' }}
                    >
                      {t('injects')}
                    </div>
                    <div className={classes.bodyItem}>
                      <DryrunStatus
                        finished={dryrun.dryrun_finished}
                        variant="list"
                      />
                    </div>
                  </div>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  onClick={() => setOpenDryrunDelete(dryrun.dryrun_id)}
                  aria-haspopup="true"
                  size="large"
                  disabled={permissions.readOnlyBypassStatus}
                >
                  <DeleteOutlined />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      ) : (
        <Empty message={t('No dryrun in this simulation.')} />
      )}

      <DialogDelete
        open={Boolean(openDryrunDelete)}
        handleClose={() => setOpenDryrunDelete(null)}
        handleSubmit={submitDryrunDelete}
        text={t('Do you want to delete this dryrun?')}
      />
    </>
  );
};
export default ExerciseControlDryRuns;
