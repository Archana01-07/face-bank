import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerData {
  category: string;
  lastVisit?: {
    purpose: string;
    outcome: string;
    staff_notes: string;
  };
  behaviors: Array<{
    behavior_type: string;
    context: string;
    timestamp: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerData } = await req.json() as { customerData: CustomerData };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for AI
    const behaviorSummary = customerData.behaviors
      .slice(0, 5)
      .map(b => `${b.behavior_type} - ${b.context || 'No context'}`)
      .join('\n');

    const systemPrompt = `You are an expert banking customer service advisor. Analyze customer history and provide a critical insight for staff.

Your response must be structured JSON with this field:
- priorityNote: One critical insight about this customer that staff should be aware of (1-2 sentences)`;

    const userPrompt = `Customer Category: ${customerData.category}

Last Visit:
${customerData.lastVisit ? `Purpose: ${customerData.lastVisit.purpose}
Outcome: ${customerData.lastVisit.outcome}
Notes: ${customerData.lastVisit.staff_notes || 'None'}` : 'No previous visits'}

Recent Behavior History:
${behaviorSummary || 'No behavior records'}

Based on this history, provide a priority note highlighting the most important thing staff should remember about this customer.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_customer_insights",
              description: "Generate priority note for staff",
              parameters: {
                type: "object",
                properties: {
                  priorityNote: {
                    type: "string",
                    description: "Most critical insight about this customer"
                  }
                },
                required: ["priorityNote"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_customer_insights" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating insights:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate insights" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
