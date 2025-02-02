import * as schema from './Schema';
import { getReferential, putReferential, postReferential, delReferential, simplePostCall } from '../utils/Action';

export const fetchPayloads = () => (dispatch) => {
  const uri = '/api/payloads';
  return getReferential(schema.arrayOfPayloads, uri)(dispatch);
};

export const fetchPayload = (payloadId) => (dispatch) => {
  const uri = `/api/payloads/${payloadId}`;
  return getReferential(schema.payload, uri)(dispatch);
};

export const searchPayloads = (paginationInput) => {
  const data = paginationInput;
  const uri = '/api/payloads/search';
  return simplePostCall(uri, data);
};

export const updatePayload = (payloadId, data) => (dispatch) => {
  const uri = `/api/payloads/${payloadId}`;
  return putReferential(schema.payload, uri, data)(dispatch);
};

export const addPayload = (data) => (dispatch) => {
  const uri = '/api/payloads';
  return postReferential(schema.payload, uri, data)(dispatch);
};

export const deletePayload = (payloadId) => (dispatch) => {
  const uri = `/api/payloads/${payloadId}`;
  return delReferential(uri, 'payloads', payloadId)(dispatch);
};
