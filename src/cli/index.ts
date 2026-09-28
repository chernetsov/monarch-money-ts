#!/usr/bin/env node
import { Command } from 'commander';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { getAccounts, getAccountsRefreshStatus, refreshAccounts } from '../accounts.api.js';
import {
  AccountFiltersInputSchema,
  AccountSchema,
  AccountsRefreshResultSchema,
  AccountsRefreshStatusInputSchema,
  AccountsRefreshStatusSchema,
  RefreshAccountsInputSchema,
} from '../accounts.types.js';
import { getCashflow, getCashflowSummary } from '../cashflow.api.js';
import {
  CashflowCategoryRowSchema,
  CashflowInputSchema,
  CashflowSchema,
  CashflowSummarySchema,
} from '../cashflow.types.js';
import { createTransactionTag, getTransactionTags, setTransactionTags } from '../tags.api.js';
import {
  CreateTransactionTagInputSchema,
  GetTransactionTagsInputSchema,
  SetTransactionTagsInputSchema,
  TransactionTagAssignmentSchema,
  TransactionTagSchema,
} from '../tags.types.js';
import {
  createCategory,
  restoreCategory,
  getBudgetCategory,
  getBudgetCategoryGroups,
  getBudgetCategories,
} from '../categories.api.js';
import {
  CreateCategoryInputSchema,
  BudgetCategoryDetailSchema,
  BudgetCategoryGroupWithBudgetingSchema,
  ManageCategoryGroupsResponseSchema,
} from '../categories.types.js';
import {
  getBudgetReport,
  getBudgetSettings,
  getBudgetStatus,
  setBudgetAmount,
} from '../budget.api.js';
import {
  BudgetItemSchema,
  BudgetReportInputSchema,
  BudgetReportSchema,
  BudgetSettingsSchema,
  BudgetStatusSchema,
  SetBudgetAmountInputSchema,
} from '../budget.types.js';
import { MonarchGraphQLClient } from '../graphql.js';
import { getPortfolio } from '../portfolio.api.js';
import { PortfolioInputSchema, PortfolioSchema } from '../portfolio.types.js';
import { getAggregatedRecurringItems, getRecurringTransactionStreams } from '../recurring.api.js';
import {
  AggregatedRecurringItemsSchema,
  GetAggregatedRecurringItemsInputSchema,
  GetRecurringTransactionStreamsInputSchema,
  RecurringTransactionStreamItemSchema,
} from '../recurring.types.js';
import {
  createTransactionRule,
  getTransactionRules,
  previewTransactionRule,
} from '../rules.api.js';
import {
  CreateTransactionRuleInputSchema,
  PreviewTransactionRuleOptionsSchema,
  TransactionRulePreviewInputSchema as RulePreviewInputSchema,
  TransactionRulePreviewSchema,
  TransactionRuleSchema,
} from '../rules.types.js';
import {
  getTransaction,
  getTransactions,
  getTransactionSplits,
  updateTransaction,
  updateTransactionSplits,
} from '../transactions.api.js';
import {
  GetTransactionOptionsSchema,
  GetTransactionSplitsInputSchema,
  GetTransactionsOptionsSchema,
  TransactionSchema,
  TransactionSplitsSchema,
  UpdatedTransactionSplitsSchema,
  UpdateTransactionInputSchema,
  UpdateTransactionSplitsInputSchema,
} from '../transactions.types.js';

import {
  clearAuthState,
  createAuthProvider,
  getAuthStatePath,
  getAuthStatus,
  loginAndCacheAuthState,
} from './auth.js';
import { CliError, writeError, writeSuccess } from './output.js';

type CommandHandler<TInput> = (input: TInput) => Promise<unknown>;

const JsonObjectSchema = z.record(z.unknown());
const OptionalInputSchema = JsonObjectSchema.optional().default({});
const EmptyInputSchema = z.object({}).strict().default({});

const GetBudgetCategoryInputSchema = z
  .object({
    categoryId: z.string().min(1),
  })
  .strict();

const AccountsListOutputSchema = z.array(AccountSchema);
const TransactionsListOutputSchema = z
  .object({
    transactions: z.array(TransactionSchema),
    totalCount: z.number(),
    totalSelectableCount: z.number(),
    transactionRuleIds: z.array(z.string()),
  })
  .strict();
const CategoriesGroupsOutputSchema = z.array(BudgetCategoryGroupWithBudgetingSchema);
const TransactionRulesOutputSchema = z.array(TransactionRuleSchema);

const PreviewTransactionRuleInputSchema = z
  .object({
    rule: RulePreviewInputSchema,
    options: PreviewTransactionRuleOptionsSchema.optional(),
  })
  .strict();

const schemaRegistry = new Map<string, z.ZodTypeAny>([
  ['input.empty', EmptyInputSchema],
  ['input.object', JsonObjectSchema],
  ['input.accounts.list', AccountFiltersInputSchema],
  ['input.accounts.refresh', RefreshAccountsInputSchema],
  ['input.accounts.refresh-status', AccountsRefreshStatusInputSchema],
  ['input.transactions.list', GetTransactionsOptionsSchema],
  ['input.transaction.get', GetTransactionOptionsSchema],
  ['input.transaction.update', UpdateTransactionInputSchema],
  ['input.transaction.set-tags', SetTransactionTagsInputSchema],
  ['input.transaction.splits.get', GetTransactionSplitsInputSchema],
  ['input.transaction.splits.update', UpdateTransactionSplitsInputSchema],
  ['input.tags.list', GetTransactionTagsInputSchema],
  ['input.tag.create', CreateTransactionTagInputSchema],
  ['input.category.get', GetBudgetCategoryInputSchema],
  ['input.category.create', CreateCategoryInputSchema],
  ['input.portfolio', PortfolioInputSchema],
  ['input.recurring.streams', GetRecurringTransactionStreamsInputSchema],
  ['input.recurring.aggregated', GetAggregatedRecurringItemsInputSchema],
  ['input.budget.report', BudgetReportInputSchema],
  ['input.budget.set', SetBudgetAmountInputSchema],
  ['input.cashflow', CashflowInputSchema],
  ['input.rule.preview', PreviewTransactionRuleInputSchema],
  ['input.rule.create', CreateTransactionRuleInputSchema],
  ['output.auth.metadata', JsonObjectSchema],
  ['output.accounts.list', AccountsListOutputSchema],
  ['output.accounts.refresh', AccountsRefreshResultSchema],
  ['output.accounts.refresh-status', AccountsRefreshStatusSchema],
  ['output.transactions.list', TransactionsListOutputSchema],
  ['output.transaction', TransactionSchema],
  ['output.transaction.nullable', TransactionSchema.nullable()],
  ['output.transaction.tags', TransactionTagAssignmentSchema],
  ['output.transaction.splits', TransactionSplitsSchema.nullable()],
  ['output.transaction.splits.update', UpdatedTransactionSplitsSchema],
  ['output.tags.list', z.array(TransactionTagSchema)],
  ['output.tag', TransactionTagSchema],
  ['output.budget.item', BudgetItemSchema],
  ['output.cashflow.summary', CashflowSummarySchema],
  ['output.cashflow.breakdown', CashflowSchema],
  ['output.cashflow.by-category', z.array(CashflowCategoryRowSchema)],
  ['output.categories.list', ManageCategoryGroupsResponseSchema],
  ['output.categories.groups', CategoriesGroupsOutputSchema],
  ['output.category.detail', BudgetCategoryDetailSchema],
  ['output.budget.report', BudgetReportSchema],
  ['output.budget.status', BudgetStatusSchema],
  ['output.budget.settings', BudgetSettingsSchema],
  ['output.portfolio', PortfolioSchema],
  ['output.recurring.streams', z.array(RecurringTransactionStreamItemSchema)],
  ['output.recurring.aggregated', AggregatedRecurringItemsSchema],
  ['output.rules.list', TransactionRulesOutputSchema],
  ['output.rule.preview', TransactionRulePreviewSchema],
  ['output.rule', TransactionRuleSchema],
]);

const program = new Command();

program
  .name('monarch-money')
  .description('Command line interface for the monarch-money-ts API')
  .version('0.1.0');

program.configureOutput({
  outputError: (message) => {
    process.stderr.write(message);
  },
});

const schemas = program.command('schemas').description('JSON schema registry');
schemas
  .command('list')
  .description('List named JSON schemas')
  .action(() => {
    writeSuccess(Array.from(schemaRegistry.keys()).sort());
  });
schemas
  .command('get')
  .description('Print a named JSON schema')
  .argument('<name>', 'Schema name from `monarch-money schemas list`')
  .action((name: string) => {
    try {
      const schema = schemaRegistry.get(name);
      if (!schema) {
        throw new CliError('SCHEMA_NOT_FOUND', `Unknown schema: ${name}`, 1, {
          availableSchemas: Array.from(schemaRegistry.keys()).sort(),
        });
      }
      writeSuccess(toJsonSchema(schema, name));
    } catch (error) {
      process.exitCode = writeError(error);
    }
  });

const authCommand = program.command('auth').description('Authentication state');
const authLogin = authCommand
  .command('login')
  .description('Log in with MONARCH_EMAIL/MONARCH_PASSWORD and cache the session token')
  .action(async () => {
    try {
      const state = await loginAndCacheAuthState();
      writeSuccess({
        path: getAuthStatePath(),
        ...state,
      });
    } catch (error) {
      process.exitCode = writeError(error);
    }
  });
addSchemaHelp(authLogin, 'input.empty', 'output.auth.metadata');

const authStatus = authCommand
  .command('status')
  .description('Show cached authentication state metadata')
  .action(() => {
    try {
      writeSuccess(getAuthStatus());
    } catch (error) {
      process.exitCode = writeError(error);
    }
  });
addSchemaHelp(authStatus, 'input.empty', 'output.auth.metadata');

const authLogout = authCommand
  .command('logout')
  .description('Remove cached authentication state')
  .action(() => {
    try {
      writeSuccess({
        path: getAuthStatePath(),
        removed: clearAuthState(),
      });
    } catch (error) {
      process.exitCode = writeError(error);
    }
  });
addSchemaHelp(authLogout, 'input.empty', 'output.auth.metadata');

const accounts = program.command('accounts').description('Accounts API');
const accountsList = accounts
  .command('list')
  .description('List accounts')
  .argument('[input]', 'JSON account filters')
  .action(
    runCommand(AccountFiltersInputSchema, async (filters) => {
      const { auth, client } = createContext();
      return getAccounts(auth, client, filters);
    }),
  );
addSchemaHelp(accountsList, 'input.accounts.list', 'output.accounts.list');

const accountsRefresh = accounts
  .command('refresh')
  .description('Request an institution refresh for accounts (all when accountIds is omitted)')
  .argument('[input]', 'JSON input: {"accountIds":["..."],"wait":true,"timeoutSeconds":300}')
  .action(
    runCommand(RefreshAccountsInputSchema, async (input) => {
      const { auth, client } = createContext();
      return refreshAccounts(auth, client, input);
    }),
  );
addSchemaHelp(accountsRefresh, 'input.accounts.refresh', 'output.accounts.refresh');

const accountsRefreshStatus = accounts
  .command('refresh-status')
  .description('Check whether account syncs are still in progress')
  .argument('[input]', 'JSON input: {"accountIds":["..."]}')
  .action(
    runCommand(AccountsRefreshStatusInputSchema, async (input) => {
      const { auth, client } = createContext();
      return getAccountsRefreshStatus(auth, client, input);
    }),
  );
addSchemaHelp(
  accountsRefreshStatus,
  'input.accounts.refresh-status',
  'output.accounts.refresh-status',
);

const transactions = program.command('transactions').description('Transactions API');
const transactionsList = transactions
  .command('list')
  .description('List transactions')
  .argument('[input]', 'JSON options with filters, pagination, and ordering')
  .action(
    runCommand(GetTransactionsOptionsSchema, async (input) => {
      const { auth, client } = createContext();
      return getTransactions(auth, client, input);
    }),
  );
addSchemaHelp(transactionsList, 'input.transactions.list', 'output.transactions.list');

const transactionsGet = transactions
  .command('get')
  .description('Get a transaction by ID')
  .argument('[input]', 'JSON input: {"id":"...","redirectPosted":true}')
  .action(
    runCommand(GetTransactionOptionsSchema, async (input) => {
      const { auth, client } = createContext();
      return getTransaction(auth, client, input);
    }),
  );
addSchemaHelp(transactionsGet, 'input.transaction.get', 'output.transaction.nullable');

const transactionsUpdate = transactions
  .command('update')
  .description('Update a transaction')
  .argument('[input]', 'JSON update input including transaction id')
  .action(
    runCommand(UpdateTransactionInputSchema, async (input) => {
      const { auth, client } = createContext();
      return updateTransaction(auth, client, input);
    }),
  );
addSchemaHelp(transactionsUpdate, 'input.transaction.update', 'output.transaction');

const transactionsSetTags = transactions
  .command('set-tags')
  .description('Replace the tags on a transaction (empty tagIds removes all tags)')
  .argument('[input]', 'JSON input: {"transactionId":"...","tagIds":["..."]}')
  .action(
    runCommand(SetTransactionTagsInputSchema, async (input) => {
      const { auth, client } = createContext();
      return setTransactionTags(auth, client, input);
    }),
  );
addSchemaHelp(transactionsSetTags, 'input.transaction.set-tags', 'output.transaction.tags');

const transactionSplits = transactions.command('splits').description('Transaction splits');
const transactionSplitsGet = transactionSplits
  .command('get')
  .description('Get the splits of a transaction')
  .argument('[input]', 'JSON input: {"id":"..."}')
  .action(
    runCommand(GetTransactionSplitsInputSchema, async (input) => {
      const { auth, client } = createContext();
      return getTransactionSplits(auth, client, input);
    }),
  );
addSchemaHelp(transactionSplitsGet, 'input.transaction.splits.get', 'output.transaction.splits');

const transactionSplitsUpdate = transactionSplits
  .command('update')
  .description('Replace the splits of a transaction (empty splitData removes all splits)')
  .argument(
    '[input]',
    'JSON input: {"transactionId":"...","splitData":[{"merchantName":"...","amount":-12.34,"categoryId":"..."}]}',
  )
  .action(
    runCommand(UpdateTransactionSplitsInputSchema, async (input) => {
      const { auth, client } = createContext();
      return updateTransactionSplits(auth, client, input);
    }),
  );
addSchemaHelp(
  transactionSplitsUpdate,
  'input.transaction.splits.update',
  'output.transaction.splits.update',
);

const tags = program.command('tags').description('Transaction tags API');
const tagsList = tags
  .command('list')
  .description('List household transaction tags')
  .argument('[input]', 'JSON input: {"search":"...","limit":50}')
  .action(
    runCommand(GetTransactionTagsInputSchema, async (input) => {
      const { auth, client } = createContext();
      return getTransactionTags(auth, client, input);
    }),
  );
addSchemaHelp(tagsList, 'input.tags.list', 'output.tags.list');

const tagsCreate = tags
  .command('create')
  .description('Create a transaction tag')
  .argument('[input]', 'JSON input: {"name":"...","color":"#19D2A5"}')
  .action(
    runCommand(CreateTransactionTagInputSchema, async (input) => {
      const { auth, client } = createContext();
      return createTransactionTag(auth, client, input);
    }),
  );
addSchemaHelp(tagsCreate, 'input.tag.create', 'output.tag');

const categories = program.command('categories').description('Categories API');
const categoriesList = categories
  .command('list')
  .description('List budget categories and groups')
  .action(
    runCommand(OptionalInputSchema, async () => {
      const { auth, client } = createContext();
      return getBudgetCategories(auth, client);
    }),
  );
addSchemaHelp(categoriesList, 'input.empty', 'output.categories.list');

const categoriesGroups = categories
  .command('groups')
  .description('List budget category groups with budgeting metadata')
  .action(
    runCommand(OptionalInputSchema, async () => {
      const { auth, client } = createContext();
      return getBudgetCategoryGroups(auth, client);
    }),
  );
addSchemaHelp(categoriesGroups, 'input.empty', 'output.categories.groups');

const categoriesGet = categories
  .command('get')
  .description('Get budget category detail')
  .argument('[input]', 'JSON input: {"categoryId":"..."}')
  .action(
    runCommand(GetBudgetCategoryInputSchema, async ({ categoryId }) => {
      const { auth, client } = createContext();
      return getBudgetCategory(auth, client, categoryId);
    }),
  );
addSchemaHelp(categoriesGet, 'input.category.get', 'output.category.detail');

const categoriesCreate = categories
  .command('create')
  .description('Create a budget category in an existing group')
  .argument('[input]', 'JSON input: {"groupId":"...","name":"...","icon":"🏐"}')
  .action(
    runCommand(CreateCategoryInputSchema, async (input) => {
      const { auth, client } = createContext();
      return createCategory(auth, client, input);
    }),
  );
addSchemaHelp(categoriesCreate, 'input.category.create', 'output.category.detail');

const categoriesRestore = categories
  .command('restore')
  .description('Re-enable a disabled system category')
  .argument('[input]', 'JSON input: {"categoryId":"..."}')
  .action(
    runCommand(GetBudgetCategoryInputSchema, async ({ categoryId }) => {
      const { auth, client } = createContext();
      return restoreCategory(auth, client, categoryId);
    }),
  );
addSchemaHelp(categoriesRestore, 'input.category.get', 'output.category.detail');

const budget = program.command('budget').description('Budget API');
const budgetReport = budget
  .command('report')
  .description('Get budget report')
  .argument('[input]', 'JSON input: {"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}')
  .action(
    runCommand(BudgetReportInputSchema, async (input) => {
      const { auth, client } = createContext();
      return getBudgetReport(auth, client, input);
    }),
  );
addSchemaHelp(budgetReport, 'input.budget.report', 'output.budget.report');

const budgetStatus = budget
  .command('status')
  .description('Get budget status')
  .action(
    runCommand(OptionalInputSchema, async () => {
      const { auth, client } = createContext();
      return getBudgetStatus(auth, client);
    }),
  );
addSchemaHelp(budgetStatus, 'input.empty', 'output.budget.status');

const budgetSettings = budget
  .command('settings')
  .description('Get budget settings')
  .action(
    runCommand(OptionalInputSchema, async () => {
      const { auth, client } = createContext();
      return getBudgetSettings(auth, client);
    }),
  );
addSchemaHelp(budgetSettings, 'input.empty', 'output.budget.settings');

const budgetSet = budget
  .command('set')
  .description('Set the planned amount for a category or category group for a month')
  .argument(
    '[input]',
    'JSON input: {"categoryId":"...","amount":123,"startDate":"YYYY-MM-01","applyToFuture":false}',
  )
  .action(
    runCommand(SetBudgetAmountInputSchema, async (input) => {
      const { auth, client } = createContext();
      return setBudgetAmount(auth, client, input);
    }),
  );
addSchemaHelp(budgetSet, 'input.budget.set', 'output.budget.item');

const cashflow = program.command('cashflow').description('Cash flow API');
const cashflowSummary = cashflow
  .command('summary')
  .description('Get income, expense, and savings totals (defaults to the current month)')
  .argument('[input]', 'JSON input: {"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}')
  .action(
    runCommand(CashflowInputSchema, async (input) => {
      const { auth, client } = createContext();
      return getCashflowSummary(auth, client, input);
    }),
  );
addSchemaHelp(cashflowSummary, 'input.cashflow', 'output.cashflow.summary');

const cashflowByCategory = cashflow
  .command('by-category')
  .description('Get cash flow totals by category (defaults to the current month)')
  .argument('[input]', 'JSON input: {"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}')
  .action(
    runCommand(CashflowInputSchema, async (input) => {
      const { auth, client } = createContext();
      return (await getCashflow(auth, client, input)).byCategory;
    }),
  );
addSchemaHelp(cashflowByCategory, 'input.cashflow', 'output.cashflow.by-category');

const cashflowBreakdown = cashflow
  .command('breakdown')
  .description('Get cash flow by category, category group, and merchant plus totals')
  .argument('[input]', 'JSON input: {"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}')
  .action(
    runCommand(CashflowInputSchema, async (input) => {
      const { auth, client } = createContext();
      return getCashflow(auth, client, input);
    }),
  );
addSchemaHelp(cashflowBreakdown, 'input.cashflow', 'output.cashflow.breakdown');

const portfolio = program
  .command('portfolio')
  .description('Get portfolio')
  .argument('[input]', 'JSON portfolio input')
  .action(
    runCommand(PortfolioInputSchema, async (input) => {
      const { auth, client } = createContext();
      return getPortfolio(auth, client, input);
    }),
  );
addSchemaHelp(portfolio, 'input.portfolio', 'output.portfolio');

const recurring = program.command('recurring').description('Recurring transactions API');
const recurringStreams = recurring
  .command('streams')
  .description('List recurring transaction streams')
  .argument('[input]', 'JSON input: {"includeLiabilities":true}')
  .action(
    runCommand(GetRecurringTransactionStreamsInputSchema, async (input) => {
      const { auth, client } = createContext();
      return getRecurringTransactionStreams(auth, client, input);
    }),
  );
addSchemaHelp(recurringStreams, 'input.recurring.streams', 'output.recurring.streams');

const recurringAggregated = recurring
  .command('aggregated')
  .alias('items')
  .description('Get recurring calendar items grouped by status for a date range')
  .argument('[input]', 'JSON input: {"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","filters":{}}')
  .action(
    runCommand(GetAggregatedRecurringItemsInputSchema, async (input) => {
      const { auth, client } = createContext();
      return getAggregatedRecurringItems(auth, client, input);
    }),
  );
addSchemaHelp(recurringAggregated, 'input.recurring.aggregated', 'output.recurring.aggregated');

const rules = program.command('rules').description('Transaction rules API');
const rulesList = rules
  .command('list')
  .description('List transaction rules')
  .action(
    runCommand(OptionalInputSchema, async () => {
      const { auth, client } = createContext();
      return getTransactionRules(auth, client);
    }),
  );
addSchemaHelp(rulesList, 'input.empty', 'output.rules.list');

const rulesPreview = rules
  .command('preview')
  .description('Preview a transaction rule')
  .argument('[input]', 'JSON input: {"rule":{...},"options":{"limit":30}}')
  .action(
    runCommand(PreviewTransactionRuleInputSchema, async ({ rule, options }) => {
      const { auth, client } = createContext();
      return previewTransactionRule(auth, client, rule, options);
    }),
  );
addSchemaHelp(rulesPreview, 'input.rule.preview', 'output.rule.preview');

const rulesCreate = rules
  .command('create')
  .description('Create a transaction rule (preview it first with rules preview)')
  .argument(
    '[input]',
    'JSON input: {"merchantCriteria":[{"operator":"contains","value":"..."}],"setCategoryAction":"...","applyToExistingTransactions":false}',
  )
  .action(
    runCommand(CreateTransactionRuleInputSchema, async (input) => {
      const { auth, client } = createContext();
      return createTransactionRule(auth, client, input);
    }),
  );
addSchemaHelp(rulesCreate, 'input.rule.create', 'output.rule');

program.exitOverride();

program.parseAsync(process.argv).catch((error: unknown) => {
  if (isCommanderInformationalExit(error)) {
    process.exitCode = 0;
    return;
  }
  process.exitCode = writeError(error);
});

function createContext(): {
  auth: ReturnType<typeof createAuthProvider>;
  client: MonarchGraphQLClient;
} {
  return {
    auth: createAuthProvider(),
    client: new MonarchGraphQLClient(process.env.MONARCH_GRAPHQL_ENDPOINT),
  };
}

function runCommand<TInput>(
  schema: z.ZodType<TInput>,
  handler: CommandHandler<TInput>,
): (...args: unknown[]) => Promise<void> {
  return async (...args: unknown[]) => {
    try {
      const input = typeof args[0] === 'string' ? args[0] : undefined;
      const rawInput = await parseInput(input);
      const parsed = schema.safeParse(rawInput);
      if (!parsed.success) {
        throw new CliError(
          'INVALID_INPUT',
          'Command input did not match the expected JSON shape.',
          1,
          {
            issues: parsed.error.issues,
          },
        );
      }
      const data = await handler(parsed.data);
      writeSuccess(data);
    } catch (error) {
      process.exitCode = writeError(error);
    }
  };
}

async function parseInput(input: string | undefined): Promise<unknown> {
  const fromStdin = input === '-';
  const json = fromStdin ? await readStdin() : input;
  if (json === undefined || json.trim() === '') {
    if (fromStdin) {
      throw new CliError('EMPTY_INPUT', 'Expected JSON on stdin because input was "-".', 1);
    }
    return {};
  }
  try {
    return JSON.parse(json);
  } catch (cause) {
    throw new CliError(
      'INVALID_JSON',
      `Could not parse input as JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
      1,
    );
  }
}

async function readStdin(): Promise<string> {
  let data = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    data += chunk;
  }
  return data;
}

function addSchemaHelp(command: Command, inputSchemaName: string, outputSchemaName: string): void {
  command.addHelpText('after', () =>
    [
      '',
      'Schemas:',
      `  input:  ${inputSchemaName}`,
      `  output: ${outputSchemaName}`,
      '',
      `Print a schema with: monarch-money schemas get ${inputSchemaName}`,
    ].join('\n'),
  );
}

function toJsonSchema(schema: z.ZodTypeAny, name: string): unknown {
  const convert = zodToJsonSchema as unknown as (
    schema: z.ZodTypeAny,
    options: { name: string },
  ) => unknown;
  return convert(schema, { name });
}

function isCommanderInformationalExit(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;
  const message = error instanceof Error ? error.message : undefined;
  return (
    code === 'commander.helpDisplayed' ||
    code === 'commander.version' ||
    code === 'commander.versionDisplayed' ||
    message === '(outputHelp)'
  );
}
