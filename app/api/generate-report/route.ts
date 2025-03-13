import { FinancialConsortium } from "../workflow";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { files } = await req.json();
  const firstFile = files[0].data;
  const query = `The following is a JSON representation of a financial report.
  Analyze the data and return a full analysis of the data. It should be at the level of a professional analyst.
  Report:
  ${JSON.stringify(firstFile)}
  `;

  const financialConsortium = new FinancialConsortium();

  const initialData = {
    responses: new Map(),
    iteration: 1,
    maxIterations: 3,
  };
  const result = await financialConsortium.workflow.run(query, initialData);

  return new Response(JSON.stringify({ message: result }), {
    status: 200,
  });
}
