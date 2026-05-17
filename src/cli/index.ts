#!/usr/bin/env node
import { Command } from 'commander';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { getAccounts } from '../accounts.api.js';
import { AccountFiltersInputSchema, AccountSchema } from '../accounts.types.js';
import {
  getBudgetCategory,
  getBudgetCategoryGroups,
  getBudgetCategories,
} from '../categories.api.js';
import {
  BudgetCategoryDetailSchema,
  BudgetCategoryGroupWithBudgetingSchema,
  ManageCategoryGroupsResponseSchema,
} from '../categories.types.js';
import { getBudgetReport, getBudgetSettings, getBudgetStatus } from '../budget.api.js';
import {
  BudgetReportInputSchema,
  BudgetReportSchema,
  BudgetSettingsSchema,
  BudgetStatusSchema,
} from '../budget.types.js';
import { MonarchGraphQLClient } from '../graphql.js';
import { getPortfolio } from '../portfolio.api.js';
import { PortfolioInputSchema, PortfolioSchema } from '../portfolio.types.js';
import { getTransactionRules, previewTransactionRule } from '../rules.api.js';
import {
  PreviewTransactionRuleOptionsSchema,
  TransactionRulePreviewInputSchema as RulePreviewInputSchema,
  TransactionRulePreviewSchema,
  TransactionRuleSchema,
} from '../rules.types.js';
import { getTransaction, getTransactions, updateTransaction } from '../transactions.api.js';
import {
  GetTransactionOptionsSchema,
  GetTransactionsOptionsSchema,
  TransactionSchema,
  UpdateTransactionInputSchema,
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
  ['input.transactions.list', GetTransactionsOptionsSchema],
  ['input.transaction.get', GetTransactionOptionsSchema],
  ['input.transaction.update', UpdateTransactionInputSchema],
  ['input.category.get', GetBudgetCategoryInputSchema],
  ['input.portfolio', PortfolioInputSchema],
  ['input.budget.report', BudgetReportInputSchema],
  ['input.rule.preview', PreviewTransactionRuleInputSchema],
  ['output.auth.metadata', JsonObjectSchema],
  ['output.accounts.list', AccountsListOutputSchema],
  ['output.transactions.list', TransactionsListOutputSchema],
  ['output.transaction', TransactionSchema],
  ['output.transaction.nullable', TransactionSchema.nullable()],
  ['output.categories.list', ManageCategoryGroupsResponseSchema],
  ['output.categories.groups', CategoriesGroupsOutputSchema],
  ['output.category.detail', BudgetCategoryDetailSchema],
  ['output.budget.report', BudgetReportSchema],
  ['output.budget.status', BudgetStatusSchema],
  ['output.budget.settings', BudgetSettingsSchema],
  ['output.portfolio', PortfolioSchema],
  ['output.rules.list', TransactionRulesOutputSchema],
  ['output.rule.preview', TransactionRulePreviewSchema],
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
