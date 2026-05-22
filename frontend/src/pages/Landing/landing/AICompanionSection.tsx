import { Card } from "../ui/card";
import { Sparkles, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";

const chatMessages = [
  {
    id: 1,
    sender: "user",
    text: "What permits do I need for a bathroom renovation?",
  },
  {
    id: 2,
    sender: "ai",
    text: "For a bathroom renovation in Germany, you typically need a Baugenehmigung if you're changing the layout. I can help you prepare the documentation.",
  },
  { id: 3, sender: "user", text: "How much will it cost?" },
  {
    id: 4,
    sender: "ai",
    text: "Based on your project details, estimated costs range from €8,000-€15,000. Would you like me to break down the costs by category?",
  },
];

export function AICompanionSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-emerald-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">AI-Powered Assistant</span>
            </div>
            <h2 className="mb-4">Ask Questions, Get Instant Guidance</h2>
            <p className="text-gray-700 text-lg mb-6">
              Our AI assistant understands German renovation regulations,
              financing options, and helps you navigate every step of your
              project.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">
                  Instant answers to renovation questions
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">
                  Automated paperwork and documentation
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-gray-700">
                  Personalized recommendations based on your project
                </span>
              </li>
            </ul>
          </div>

          <div>
            <Card className="shadow-2xl">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div>RenovAlte AI Assistant</div>
                    <div className="text-xs text-emerald-100">
                      Online • Ready to help
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4 h-96 overflow-y-auto bg-gray-50">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.sender === "ai" && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-emerald-600 text-white">
                          <Sparkles className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl ${
                        message.sender === "user"
                          ? "bg-emerald-600 text-white rounded-br-sm"
                          : "bg-white border border-gray-200 rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                    {message.sender === "user" && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          U
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-white border-t rounded-b-lg">
                <div className="flex gap-2">
                  <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                    Ask me anything about your renovation...
                  </div>
                  <Button
                    disabled
                    className="bg-emerald-600 hover:bg-emerald-600"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
