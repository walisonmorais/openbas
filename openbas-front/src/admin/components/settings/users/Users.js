import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { List, ListItem, ListItemIcon, ListItemSecondaryAction, ListItemText } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { CheckCircleOutlined, PersonOutlined } from '@mui/icons-material';
import { searchUsers } from '../../../../actions/User';
import { fetchOrganizations } from '../../../../actions/Organization';
import ItemTags from '../../../../components/ItemTags';
import CreateUser from './CreateUser';
import { fetchTags } from '../../../../actions/Tag';
import useDataLoader from '../../../../utils/ServerSideEvent';
import { useHelper } from '../../../../store';
import UserPopover from './UserPopover';
import SecurityMenu from '../SecurityMenu';
import { useFormatter } from '../../../../components/i18n';
import { initSorting } from '../../../../components/common/pagination/Page';
import Breadcrumbs from '../../../../components/Breadcrumbs';
import PaginationComponent from '../../../../components/common/pagination/PaginationComponent';
import SortHeadersComponent from '../../../../components/common/pagination/SortHeadersComponent';

const useStyles = makeStyles(() => ({
  container: {
    margin: 0,
    padding: '0 200px 50px 0',
  },
  itemHead: {
    paddingLeft: 10,
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  item: {
    paddingLeft: 10,
    height: 50,
  },
  bodyItem: {
    height: '100%',
    fontSize: 13,
  },
}));

const headerStyles = {
  user_email: {
    width: '25%',
  },
  user_firstname: {
    width: '15%',
  },
  user_lastname: {
    width: '15%',
  },
  user_organization: {
    width: '20%',
  },
  user_admin: {
    width: '10%',
  },
  user_tags: {
    width: '12%',
  },
};

const inlineStyles = {
  user_email: {
    float: 'left',
    width: '25%',
    height: 20,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  user_firstname: {
    float: 'left',
    width: '15%',
    height: 20,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  user_lastname: {
    float: 'left',
    width: '15%',
    height: 20,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  user_organization: {
    float: 'left',
    width: '20%',
    height: 20,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  user_admin: {
    float: 'left',
    width: '10%',
    height: 20,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  user_tags: {
    float: 'left',
    width: '12%',
    height: 20,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

const Users = () => {
  // Standard hooks
  const classes = useStyles();
  const dispatch = useDispatch();
  const { t } = useFormatter();
  const { tagsMap, organizationsMap } = useHelper((helper) => ({
    organizationsMap: helper.getOrganizationsMap(),
    tagsMap: helper.getTagsMap(),
  }));
  useDataLoader(() => {
    dispatch(fetchTags());
    dispatch(fetchOrganizations());
  });

  // Headers
  const headers = [
    { field: 'user_email', label: 'Email address', isSortable: true },
    { field: 'user_firstname', label: 'Firstname', isSortable: true },
    { field: 'user_lastname', label: 'Lastname', isSortable: true },
    { field: 'user_organization', label: 'Organization', isSortable: true },
    { field: 'user_admin', label: 'Administrator', isSortable: true },
  ];

  const [users, setUsers] = useState([]);
  const [searchPaginationInput, setSearchPaginationInput] = useState({
    sorts: initSorting('user_email'),
  });

  // Export
  const exportProps = {
    exportType: 'tags',
    exportKeys: [
      'user_email',
      'user_firstname',
      'user_lastname',
    ],
    exportData: users,
    exportFileName: `${t('Users')}.csv`,
  };

  return (
    <div className={classes.container}>
      <Breadcrumbs variant="list" elements={[{ label: t('Settings') }, { label: t('Security') }, { label: t('Users'), current: true }]} />
      <SecurityMenu />
      <PaginationComponent
        fetch={searchUsers}
        searchPaginationInput={searchPaginationInput}
        setContent={setUsers}
        exportProps={exportProps}
      />
      <div className="clearfix" />
      <List>
        <ListItem
          classes={{ root: classes.itemHead }}
          divider={false}
          style={{ paddingTop: 0 }}
        >
          <ListItemIcon>
            <span
              style={{
                padding: '0 8px 0 8px',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              &nbsp;
            </span>
          </ListItemIcon>
          <ListItemText
            primary={
              <SortHeadersComponent
                headers={headers}
                inlineStylesHeaders={headerStyles}
                searchPaginationInput={searchPaginationInput}
                setSearchPaginationInput={setSearchPaginationInput}
              />
              }
          />
          <ListItemSecondaryAction> &nbsp; </ListItemSecondaryAction>
        </ListItem>
        {users.map((user) => (
          <ListItem
            key={user.user_id}
            classes={{ root: classes.item }}
            divider={true}
          >
            <ListItemIcon>
              <PersonOutlined color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={
                <div>
                  <div
                    className={classes.bodyItem}
                    style={inlineStyles.user_email}
                  >
                    {user.user_email}
                  </div>
                  <div
                    className={classes.bodyItem}
                    style={inlineStyles.user_firstname}
                  >
                    {user.user_firstname}
                  </div>
                  <div
                    className={classes.bodyItem}
                    style={inlineStyles.user_lastname}
                  >
                    {user.user_lastname}
                  </div>
                  <div
                    className={classes.bodyItem}
                    style={inlineStyles.user_organization}
                  >
                    {
                      organizationsMap[user.user_organization]
                        ?.organization_name
                    }
                  </div>
                  <div
                    className={classes.bodyItem}
                    style={inlineStyles.user_admin}
                  >
                    {user.user_admin ? (
                      <CheckCircleOutlined fontSize="small" />
                    ) : (
                      '-'
                    )}
                  </div>
                  <div
                    className={classes.bodyItem}
                    style={inlineStyles.user_tags}
                  >
                    <ItemTags variant="list" tags={user.user_tags} />
                  </div>
                </div>
              }
            />
            <ListItemSecondaryAction>
              <UserPopover
                user={user}
                tagsMap={tagsMap}
                organizationsMap={organizationsMap}
              />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
      <CreateUser />
    </div>
  );
};

export default Users;
