/*
 * Licensed to Incentum Ltd. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Incentum Ltd. licenses this file to you under
 * the Token Use License Version 1.0 and the Token Use
 * Clause (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of
 * the License at
 *
 *  https://github.com/incentum-network/tul/blob/master/LICENSE.md
 *  https://github.com/incentum-network/tul/blob/master/TUC.md
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import axios from 'axios'
import { uniqueKey, StateJson, hashString } from '@incentum/praxis-interfaces'
import isNode from 'detect-node'

let port = 5000
let host = '127.0.0.1'
let rootDir = '/home/bill/.spaces'
const getUrl = () => `http://${host}:${port}`

export function hashSpaceName(ledger: string, space: string) {
  return 'SP' + hashString(`${ledger}/${space}`)
}

export interface ExtensionContext {
  functions: any
  sections: any
}

const startedSpaces = new Map<string, StartedSpace>()
const cachedPermissions = new Map<string, Map<string, PermissionDocument>>()
export async function startChain() {
}

export async function endChain() {
  for (const key of startedSpaces.keys()) {
    const started = startedSpaces.get(key)!
    await stopSpace(started.hashSpace)
  }
}

function setCachedPermission(space: string, permissions: PermissionDocument) {
  const key = permissionKey(permissions._praxis_permission_ledger,permissions._praxis_permission_contract)
  let spacePerms = cachedPermissions.get(space)
  if (!spacePerms) {
    spacePerms = new Map<string, PermissionDocument>()
    cachedPermissions.set(space, spacePerms)
  }
  spacePerms.set(key, permissions)
}

function removeCachedPermission(space: string, ledger: string, contract: string): void {
  const spacePerms = cachedPermissions.get(space)
  if (!spacePerms) { return }
  const key = permissionKey(ledger, contract)
  spacePerms.delete(key)
}

export const defaultPermissionLedger = '_defaults_'
function getCachedPermission(space: string, ledger: string, contract: string): PermissionDocument | undefined {
  const spacePerms = cachedPermissions.get(space)
  if (!spacePerms) { return undefined }
  return spacePerms.get(permissionKey(ledger, contract))
}

export interface Analyzer {
  charFilters?: string[]
  class: string

  // ArabicAnalyzer
  // ArmenianAnalyzer
  // BasqueAnalyzer
  // BrazilianAnalyzer
  // BulgarianAnalyzer
  // CJKAnalyzer
  // CatalanAnalyzer
  // EnglishAnalyzer
  // GermanAnalyzer
  // StandardAnalyzer
  // WhitespaceAnalyzer
  stemExclusionSet?: string[]
  stopWords?: string[]

  // CollationKeyAnalyzer
  locale?: {
    country: string
    language: string
    variant: string
  }

  offsetGap?: number
  positionIncrementGap?: number
  tokenFilters?: string[]
  tokenizer?: string
}

export type FieldType = 'atom' | 'text' | 'boolean' | 'long' | 'int' | 'double' | 'float' | 'lat_lon' | 'datetime' | 'virtual'

export interface SpaceField {
  analyzer?: Analyzer
  dateTimeFormat?: string
  docValuesFormat?: string
  expression?: string
  facet?: 'yes' | 'no',
  facetIndexFieldName?: string
  group?: boolean
  highlight?: boolean
  indexAnalyzer?: Analyzer
  indexOptions?: string
  multiValued?: boolean
  omitNorms?: boolean
  postingsFormat?: string
  search?: boolean
  searchAnalyzer?: Analyzer
  similarity?: {
    // DefaultSimilarity
    class?: string
    // BM25Similarity
    b?: number
    k1?: number
  }
  sort?: boolean
  store?: boolean
  storeDocValues?: boolean
  termVectors?: string
  tokenize?: boolean
  type: FieldType
}

export interface UpdateDoc {
  term: {
    field: string
    term: any
  }
}

export function setRootDir(dir: string) {
  rootDir = dir
}

export function setPort(p: number) {
  port = p
}

export function setHost(h: string) {
  host = h
}

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  )
}

export function getRootDir(space: string): string {
  return `${rootDir}/${space}`
}

export async function createSpace(space: string): Promise<void> {
  const result = await axios.post(`${getUrl()}/createIndex`, {indexName: space, rootDir: getRootDir(space)})
}

export async function deleteSpace(space: string): Promise<void> {
  await axios.post(`${getUrl()}/deleteIndex`, {indexName: space})
}

export async function commitSpace(space: string): Promise<number> {
  const resp = await axios.post(`${getUrl()}/commit`, {indexName: space})
  await sleep(1000) // this is a hack for now, needs to be fixed on backend - it seems to do a merge which can hose an immediate search
  return resp.data.indexGen || 0
}

export async function startSpace(space: string, commit?: Commit): Promise<void> {
  await axios.post(`${getUrl()}/startIndex`, {indexName: space })
}

export async function stopSpace(space: string): Promise<void> {
  await axios.post(`${getUrl()}/stopIndex`, {indexName: space})
}

export async function registerFields(space: string, fields: any): Promise<any> {
  return await axios.post(`${getUrl()}/registerFields`, { indexName: space, fields})
}

export async function deleteDocuments(space: string, field: string, values: any[]): Promise<number> {
  const resp = await axios.post(`${getUrl()}/deleteDocuments`, { indexName: space, field, values})
  return resp.data.deleted
}

export async function addDocument(space: string, fields: any): Promise<void> {
  await axios.post(`${getUrl()}/addDocument`, {indexName: space, fields})
}

export async function updateDocument(space: string, term: UpdateDoc, fields: any): Promise<void> {
  await axios.post(`${getUrl()}/updateDocument`, {indexName: space, fields, term})
}

export async function rollback(space: string): Promise<void> {
  await axios.post(`${getUrl()}/rollback`, {indexName: space})
}

export async function searchSpace(space: string, search: SpaceSearch, findLatestCommit: FindLatestCommit): Promise<Hits> {
  const commit = await findLatestCommit(space);
  const parms = commit ? {indexName: space, ...search, version: commit.version} : {indexName: space, ...search}
  const ret = await axios.post(`${getUrl()}/search`, parms)
  return ret.data
}

export type Occur = 'FILTER' | 'MUST' | 'MUST_NOT' | 'SHOULD'
export type Classes =
  'BooleanFieldQuery' |
  'BooleanQuery' |
  'CommonTermsQuery' |
  'CommonTermsQuery' |
  'ConstantScoreQuery' |
  'DisjunctionMaxQuery' |
  'FuzzyQuery' |
  'LatLonBoxQuery' |
  'LatLonDistanceQuery' |
  'LatLonPolygonQuery' |
  'MultiPhraseQuery' |
  'PrefixQuery' |
  'RegexpQuery' |
  'TermQuery' |
  'TermRangeQuery' |
  'ToParentBlockJoinQuery' |
  'WildcardQuery'

export interface SortChildHits {
  field: string
  missingLast?: boolean
  origin?: {
    latitude: number
    longitude: number
  }
  reverse?: boolean
  selector?: string
}

export interface NumericRange {
  label: string
  max: number
  maxInclusive?: boolean
  min: number
  minInclusive?: boolean
}

export interface PolygonQuery {
  holes: any[]
  vertices: any[]
}

export interface Filter {
  field: string
  numericRange: NumericRange
  query: Query
  value: string | string[]
}

export interface SubQuery {
  occur?: Occur
  query: Query
}

export interface Query {
  boost?: number
}

export interface BooleanFieldQuery extends Query {
  class: 'BooleanFieldQuery'
  field: string
}

export interface BooleanQuery extends Query {
  class: 'BooleanQuery'
  disableCoord?: boolean
  minumumNumberShouldMatch?: number
  subQueries: SubQuery[]
}

export interface CommonTermsQuery extends Query {
  class: 'CommonTermsQuery'
  highFreqOccur: Occur
  lowFreqOccur: Occur
  maxTermFrequence: number
  terms: string[]
}

export interface ConstantScoreQuery extends Query {
  class: 'ConstantScoreQuery'
  query: Query
}

export interface DisjunctionMaxQuery extends Query {
  class: 'DisjunctionMaxQuery'
  subQueries: Query[]
  tieBreakMultiplier?: number
}

export interface FuzzyQuery extends Query {
  class: 'FuzzyQuery'
  maxEdits?: number
  maxExpansions?: number
  prefixLength?: number
  term: string
  transposition?: boolean
}

export interface LatLonBoxQuery extends Query {
  class: 'LatLonBoxQuery'
  maxLatitude: number
  maxLongitude: number
  minLatitude: number
  minLongitude: number
}

export interface LatLonDistanceQuery extends Query {
  class: 'LatLonDistanceQuery'
  latitude: number
  longitude: number
  radiusMeters: number
}

export interface LatLonPolygonQuery extends Query {
  class: 'LatLonPolygonQuery'
  geojson?: string
  polygons?: PolygonQuery[]
}

export type MultiPhraseTerms = string | number
export interface MultiPhraseQuery extends Query {
  class: 'MultiPhraseQuery'
  slop?: number
  terms: MultiPhraseTerms[]
}

export interface PrefixQuery extends Query {
  class: 'PrefixQuery'
  term: string
}

export interface RegexpQuery extends Query {
  class: 'RegexpQuery'
  regexp?: string
}

export interface TermQuery extends Query {
  class: 'TermQuery'
  term: string
}

export interface TermRangeQuery extends Query {
  class: 'TermRangeQuery'
  includeLower?: boolean
  includeUpper?: boolean
  lowerTerm: string
  upperTerm: string
}

export interface ToParentBlockJoinQuery extends Query {
  class: 'ToParentBlockJoinQuery'
  childHits: {
    maxChildren?: number
    sort?: SortChildHits[]
    trackMaxScore?: boolean
    trackScores?: boolean
  }
  childQuery: Query
  parentsFilter: Filter
  scoreMode?: string
}

export interface WildcardQuery extends Query {
  class: 'WildcardQuery'
  term: string
}

export interface TextQuery extends Query {
  defaultField?: string
  text: string
}

export interface Facet {
  dim: string
  labels: string[]
  numericRanges?: NumericRange[]
  path: string | string[]
  topN?: number
  useOrdsCache?: boolean
}

export interface ClassicQueryParser {
  class: 'classic'
  defaultField: string

  defaultOperator?: string
  enablePositionIncrements?: boolean
  fuzzyMinSim?: number
  fuzzyPrefixLength?: number
  locale?: string
  phraseSlop?: number
}

export interface MultiFieldQueryParser {
  class: 'MultiFieldQueryParser'
  fields?: string[]
  defaultOperator?: string
  enablePositionIncrements?: boolean
  fuzzyMinSim?: number
  fuzzyPrefixLength?: number
  locale?: string
  phraseSlop?: number
}

export interface SimpleQueryParser {
  class: 'SimpleQueryParser'
  fields: string[]
  operators: string[]

  defaultOperator?: string
  enablePositionIncrements?: boolean
  fuzzyMinSim?: number
  fuzzyPrefixLength?: number
  locale?: string
  phraseSlop?: number
}

export type QueryParsers = SimpleQueryParser | MultiFieldQueryParser | ClassicQueryParser

export interface Sort {
  doDocScores?: boolean
  doMaxScore?: boolean
  fields: string[]
}

export interface SpaceSearch {
  queryText?: string
  queryParser?: QueryParsers
  query?: any
  grouping?: {
    field: string
    doDocScores?: boolean
    doMaxScore?: boolean
    doTotalGroupCount: boolean
    groupStart?: number
    groupsPerPage?: number
    hitsPerGroup?: number
    sort?: Sort[]
  }
  retrieveFields?: string[]
  facets?: Facet[]
  drilldowns?: Filter[]
  searchAfter?: {
    lastDoc: number
    lastFieldValues: string
    lastScore: number
  }
  sort?: Sort
  startHit?: number
  timeoutSec?: number
  topHits?: number
  virtualFields?: [{
    name: string
    expression: string
  }]
}

export interface ScoreDoc {
  doc: number
  float: number
  document: any
}

export interface Hit {
  doc: number
  fields: any
  score: number
}

export interface FacetHit {
  counts: any[]
  childCount: number
}

export interface Hits {
  totalHits: number
  hits: Hit[]
  searchState: SearchState
  facets: FacetHit[]
}

export interface SearchState {
  searcher: number
}

export type HashSpaceName = (ledger: string, space: string) => string

export async function getSpaceName(ledger: string, contract: string, space: string, op: PermissionOp, findLatestCommit: FindLatestCommit): Promise<string> {
  const maybeLedger = space.split(':')
  if (maybeLedger.length === 1) { return hashSpaceName(ledger, space) }
  const spaceName = hashSpaceName(maybeLedger[0], maybeLedger[1])
  if (op === PermissionOp.any) { return spaceName }
  if (op === PermissionOp.none) { throw new Error('Permission denied')}
  const has = await hasPermission(spaceName, ledger, contract, op, findLatestCommit)
  if (!has) { throw new Error('Permission denied')}
  return spaceName
}

export function compoundSpaceName(space: string) {
  return space.includes(':') ? space.split(':') : false
}

enum PermissionOp {
  addDocument = '_praxis_addDocument',
  deleteDocument = '_praxis_deleteDocument',
  updateDocument = '_praxis_updateDocument',
  commitSpace = '_praxis_commitSpace',
  search = '_praxis_search',
  any = 'any',
  none = 'none',
}

interface Permission {
  _praxis_addDocument: boolean
  _praxis_deleteDocument: boolean
  _praxis_updateDocument: boolean
  _praxis_search: boolean
}

const permissionKeyField = '_praxis_permission_key'
const permissionLedgerField = '_praxis_permission_ledger'
const permissionContractField = '_praxis_permission_contract'
interface PermissionDocument extends Permission {
  _praxis_permission_key?: string
  _praxis_permission_ledger: string
  _praxis_permission_contract: string
}

export const permissionKey = (ledger, contract) => `${contract}/${ledger}`
async function getPermissions(space: string, ledger: string, contract: string, findLatestCommit: FindLatestCommit): Promise<PermissionDocument | undefined> {
  await startSpaceIfNotStarted(space)
  
  const query = { 
    query: {
      class: "TermQuery",
      field: permissionKeyField,
      term: permissionKey(ledger, contract)
    },
    retrieveFields: [
      permissionKeyField,
      permissionContractField,
      permissionLedgerField,
      '_praxis_commitSpace',
      '_praxis_addDocument',
      '_praxis_deleteDocument',
      '_praxis_updateDocument',
      '_praxis_search',
    ],
  }

  const hits = await searchSpace(space, query, findLatestCommit)
  if (hits.totalHits === 0) { return undefined }
  return hits.hits[0].fields as PermissionDocument
}

function SetPermissions(state: StateJson, space: string, permissions: PermissionDocument): void {
  const ledger = permissions._praxis_permission_ledger
  const contract = permissions._praxis_permission_contract
  const key = permissionKey(ledger, contract)
  permissions._praxis_permission_key = key;
  deleteDocumentFromSpace(state, space, permissionKeyField, [key])
  addDocumentToSpace(state, space, permissions)
  removeCachedPermission(space, ledger, contract)
}

export type FindLatestCommit = (string) => Promise<Commit | undefined>

export async function hasPermission(space: string, ledger: string, contract: string, op: PermissionOp, findLatestCommit: FindLatestCommit) {
  let permissions = getCachedPermission(space, ledger, contract)
  if (permissions) { return permissions[op] ? true : false }
  permissions = await getPermissions(space, ledger, contract, findLatestCommit)
  if (permissions) {
    setCachedPermission(space, permissions)
    return permissions[op] ? true : false
  }
  return ledger === defaultPermissionLedger ? false : await hasPermission(space, defaultPermissionLedger, contract, op, findLatestCommit)
}

interface StartedSpace {
  hashSpace: string
  commit?: Commit
}

export async function getDirectoryHash(space: string): Promise<string> {
  if (isNode) {
    const { hashElement } = await import('folder-hash')
    const dir = `${getRootDir(space)}/shard0/index`
    const opts = {
      algo: 'sha256',
      encoding: 'hex',
      files: {
        exclude: 'write.lock',
      },
    }
    const hashes = await hashElement(dir, opts)
    return hashes.hash
  } else {
    return uniqueKey()
  }
}

export interface Commit {
  version: number
  hash: string
  space: string
}

export interface SpaceResult {
  error: boolean
  e?: any
}

export interface StartSpaceResult extends SpaceResult {
  commit?: Commit
}

export interface SearchSpaceResult extends SpaceResult {
  hits?: Hits
}

export interface RegisterFieldsSpaceResult extends SpaceResult {
  fields?: Hits
}

let dev = false
export function setDevEnv() {
  dev = true
}

export async function startSpaceIfNotStarted(space: string, commit?: Commit) {
  if (!startedSpaces.get(space)) {
    try {
      await startSpace(space, commit)
      startedSpaces.set(space, { hashSpace: space, commit })
    } catch (e) {
      // console.log('startSpace failed', e)
      if (!dev) {
        throw e
      } else {
        // TODO Only ignore if it's already open
        startedSpaces.set(space, { hashSpace: space, commit })
      }
    }
  }
}

enum DocActionType {
  add = 'add',
  delete = 'delete',
  update = 'update',
}

interface DocAction {
  space: string
  docAction: DocActionType
}

interface AddDocAction extends DocAction {
  fields: any
}

interface DeleteDocAction extends DocAction {
  field: string
  values: any
}

interface UpdateDocAction extends DocAction {
  term: UpdateDoc
  fields: any
}

type DocActions = AddDocAction | DeleteDocAction | UpdateDocAction

interface StateSpace {
  docActions: DocActions[]
  commits: Commit[]
  locks: Commit[]
}

function initSpace(state: StateJson): StateSpace {
  if (!state.state._stateSpace) {
    const stateSpace: StateSpace = { docActions: [], commits: [], locks: [] }
    state.state._stateSpace = stateSpace
  }
  return state.state._stateSpace
}

async function createRegisterFields(space: string) {
  const fieldSpec: SpaceField = {
    analyzer: {
      class: 'WhitespaceAnalyzer',
    },
    similarity: {
      class: 'BM25Similarity',
      b: 0.15,
    },
    store: true,
    type: 'text',
  }
  const booleanSpec: SpaceField = {
    store: true,
    type: 'boolean',
  }
  const keywordField: SpaceField = {
    store: true,
    type: 'atom',
    search: true,
  }

  await registerFields(space, {
    _praxis_space: keywordField,
    _praxis_ledger: keywordField,
    _praxis_created: fieldSpec,
    _praxis_permission_key: keywordField,
    _praxis_permission_ledger: keywordField,
    _praxis_permission_contract: keywordField,
    _praxis_commitSpace: booleanSpec,
    _praxis_addDocument: booleanSpec,
    _praxis_updateDocument: booleanSpec,
    _praxis_deleteDocument: booleanSpec,
    _praxis_search: booleanSpec,
  })
}

async function writeFirstDocument(space: string, ledger: string, state: StateJson) {
  await addDocumentToSpace(state, space, {
    _praxis_space: space,
    _praxis_ledger: ledger,
    _praxis_created: 'Space created',
  })
}

function addCommitToSpace(state: StateJson, commit: Commit) {
  const stateSpace = initSpace(state)
  stateSpace.commits.push(commit)
}

function addLockToSpace(state: StateJson, space: string, version: number) {
  const stateSpace = initSpace(state)
  stateSpace.locks.push({ version, space, hash: ''})
}

function addDocumentToSpace(state: StateJson, space: string, fields: any) {
  const stateSpace = initSpace(state)
  stateSpace.docActions.push({ docAction: DocActionType.add, space, fields })
}

function deleteDocumentFromSpace(state: StateJson, space: string, field: string, values: any) {
  const stateSpace = initSpace(state)
  stateSpace.docActions.push({ docAction: DocActionType.delete, space, field, values })
}

function updateDocumentInSpace(state: StateJson, space: string, term: UpdateDoc, fields: any) {
  const stateSpace = initSpace(state)
  stateSpace.docActions.push({ docAction: DocActionType.update, space, fields, term })
}

async function commitDocActions(state: StateJson, space: string) {
  const stateSpace = initSpace(state)
  const actions = stateSpace.docActions.filter((action) => action.space === space)
  stateSpace.docActions = stateSpace.docActions.filter((action) => action.space !== space)
  for (const action of actions) {
    switch (action.docAction) {
      case DocActionType.add: {
        const addAction = action as AddDocAction
        await startSpaceIfNotStarted(action.space)
        await addDocument(space, addAction.fields)
        break
      }
      case DocActionType.delete: {
        const deleteAction = action as DeleteDocAction
        await startSpaceIfNotStarted(action.space)
        await deleteDocuments(action.space, deleteAction.field, deleteAction.values)
        break
      }
      case DocActionType.update: {
        const updateAction = action as UpdateDocAction
        await startSpaceIfNotStarted(action.space)
        await updateDocument(action.space, updateAction.term, updateAction.fields)
        break
      }
    }
  }
}

async function rollbackSpace(space: string, state: StateJson) {
  try {
    await rollback(space)
  } catch (e) {
    // TODO what if this fails?
    console.log('rollback failed', e)
  }
}

const errorMessage = (err: { error: boolean, e?: Error}): string => {
  return err.e ? err.e.message : 'nomsg'
}

function deleteDir(dir: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (isNode) {
      const rimraf = (await import('rimraf')).default
      rimraf(dir, (err, val) => {
        resolve()
      })
    } else {
      resolve()
    }
  })
}

export const spaceExtensionContext = (ledger: string, state: StateJson, contract: string, findLatestCommit: FindLatestCommit): ExtensionContext => {

  const context: ExtensionContext = {
    functions: {
      searchSpace: async (space: string, search: SpaceSearch, lock: boolean = false): Promise<SearchSpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, contract, space, PermissionOp.search, findLatestCommit)
          await startSpaceIfNotStarted(hashSpace)
          const hits = await searchSpace(hashSpace, search, findLatestCommit)
          if (lock) {
            addLockToSpace(state, hashSpace, hits.searchState.searcher)
          }
          return { error: false, hits }
        } catch (e) {
          return { error: true, e }
        }
      },
      createSpace: async (space: string, permissions: PermissionDocument | undefined): Promise<SpaceResult> => {
        try {
          const hashSpace = hashSpaceName(ledger, space)
          await createSpace(hashSpace)
          await startSpaceIfNotStarted(hashSpace)
          await createRegisterFields(hashSpace)
          await writeFirstDocument(hashSpace, ledger, state)
          if (permissions) {
            permissions._praxis_permission_key = permissionKey(defaultPermissionLedger, contract)
            permissions._praxis_permission_contract = contract
            permissions._praxis_permission_ledger = defaultPermissionLedger
            addDocumentToSpace(state, hashSpace, permissions)
            setCachedPermission(hashSpace, permissions)
          }
          await commitSpace(hashSpace)
          return { error: false }
        } catch (e) {
          return { error: true, e }
        }
      },
      startSpace: async (space: string, commit?: Commit): Promise<StartSpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, contract, space, PermissionOp.none, findLatestCommit)
          await startSpaceIfNotStarted(hashSpace, commit)
          return { error: false, commit }
        } catch (e) {
          return { error: true, e }
        }
      },
      stopSpace: async (space: string): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, contract, space, PermissionOp.none, findLatestCommit)
          if (startedSpaces.get(hashSpace)) {
            await stopSpace(hashSpace)
            startedSpaces.delete(hashSpace)
          }
          return { error: false }
        } catch (e) {
          return { error: true, e }
        }
      },
      deleteSpace: async (space: string): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, contract, space, PermissionOp.none, findLatestCommit)
          await deleteSpace(hashSpace)
          const dir = getRootDir(hashSpace)
          await deleteDir(dir)
          return { error: false }
        } catch (e) {
          return { error: true, e }
        }
      },
      commitSpace: async (space: string): Promise<StartSpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, contract, space, PermissionOp.commitSpace, findLatestCommit)
          await startSpaceIfNotStarted(hashSpace)
          try {
            await commitDocActions(state, hashSpace)
            const hash = await getDirectoryHash(hashSpace)
            const version = await commitSpace(hashSpace)
            const commit = { version, hash, space: hashSpace }
            addCommitToSpace(state, commit)
            return { error: false, commit }
          } catch (e) {
            await rollbackSpace(hashSpace, state)
            return { error: true, e }
          }
        } catch (e) {
          return { error: true, e }
        }
      },
      registerFieldsForSpace: async (space: string, fields: any): Promise<RegisterFieldsSpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, contract, space, PermissionOp.none, findLatestCommit)
          await startSpaceIfNotStarted(hashSpace)
          const ret = await registerFields(hashSpace, fields)
          return { error: false, fields: ret.data }
        } catch (e) {
          return { error: true, e }
        }
      },
      addDocumentToSpace: async (space: string, fields: any): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, contract, space, PermissionOp.addDocument, findLatestCommit)
          addDocumentToSpace(state, hashSpace, fields)
          return { error: false }
        } catch (e) {
          return { error: true, e }
        }
      },
      addDocumentToSpaceThenCommit: async (space: string, fields: any): Promise<SpaceResult> => {
        const hashSpace = await getSpaceName(ledger, contract, space, PermissionOp.addDocument, findLatestCommit)
        addDocumentToSpace(state, hashSpace, fields)
        const commit = await context.functions.commitSpace(space)
        if (!commit.error) { return commit }
        throw commit.e
      },
      deleteDocumentsFromSpace: async (space: string, field: string, values: any): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, contract, space, PermissionOp.deleteDocument, findLatestCommit)
          deleteDocumentFromSpace(state, hashSpace, field, values)
          return { error: false }
        } catch (e) {
          return { error: true, e }
        }
      },
      updateDocumentInSpace: async (space: string, term: UpdateDoc, fields: any): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, contract, space, PermissionOp.updateDocument, findLatestCommit)
          updateDocumentInSpace(state, hashSpace, term, fields)
          return { error: false }
        } catch (e) {
          return { error: true, e }
        }
      },
      setSpacePermissions: async (space: string, permissions: PermissionDocument): Promise<SpaceResult> => {
        try {
          const hashSpace = await getSpaceName(ledger, contract, space, PermissionOp.none, findLatestCommit)
          SetPermissions(state, hashSpace, permissions)
          return { error: false }
        } catch (e) {
          return { error: true, e }
        }
      },
      errorName: (err: { error: boolean, e?: Error}): string => {
        return err.e ? err.e.name : 'noname'
      },
      errorMessage,
      errorStack: (err: { error: boolean, e?: Error}): string => {
        return err.e && err.e.stack ? err.e.stack : 'nostack'
      },
      term: (key: string, val: string): string => {
        return `${key}:"${val}"`
      },
      getSingleHit: (res: SearchSpaceResult, type: string) => {
        if (res.error) { throw new Error(`search failed for ${type} ${context.functions.errorMessage(res)}`) }
        if (res.hits!.totalHits !== 1) { throw new Error(`${type} not found or too many`) }
        return res.hits!.hits[0].fields
      },
      query: (parts: string[], retrieveFields: string[], defaultOperator = 'and', defaultField = 'id') => {
        const terms: string[] = []
        for (let i = 0; i < parts.length; i += 2) {
          terms.push(context.functions.term(parts[i], parts[i+1]))
        }
        return {
          queryParser: {
            class: 'classic',
            defaultOperator,
            defaultField,
          },
          queryText: terms.join(' '),
          retrieveFields,
        };
      },
    },
    sections: {
      fields: {
        intField : {
          store: true,
          type: 'int',
        },
        sortedIntField : {
          store: true,
          type: 'int',
          sort: true,
        },
        longField : {
          store: true,
          type: 'long',
        },
        sortedLongField : {
          store: true,
          type: 'long',
          sort: true,
        },
        floatField : {
          store: true,
          type: 'float',
        },
        sortedFloatField : {
          store: true,
          type: 'float',
          sort: true,
        },
        doubleField : {
          store: true,
          type: 'double',
        },
        sortedDoubleField : {
          store: true,
          type: 'double',
          sort: true,
        },    
        keywordField : {
          store: true,
          type: 'atom',
          search: true,
        },
        whitespaceTextField : {
          analyzer: {
            class: 'WhitespaceAnalyzer',
          },
          similarity: {
            class: 'BM25Similarity',
            b: 0.15,
          },
          store: true,
          type: 'text',
        },
        standardTextField : {
          analyzer: {
            class: 'StandardAnalyzer',
          },
          similarity: {
            class: 'BM25Similarity',
            b: 0.15,
          },
          store: true,
          type: 'text',
        },
        dateTimeField_yyyy_MM_dd: {
          type: 'datetime',
          store: true,
          sort: true,
          dateTimeFormat: 'yyyy-MM-dd',
        },
      },
    },
  }
  return context
}
