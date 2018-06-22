// @flow

import getPath from "./get-path";

export default async function importFile(...parts /*: Array<string>*/) {
  const possiblePath = await getPath(...parts);
  return possiblePath ? require(possiblePath) : null;
}
