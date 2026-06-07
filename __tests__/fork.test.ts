import { buildForkInput } from "../lib/fork";

const source = {
  name: "Cold email",
  description: "A cold outreach email",
  category: "Marketing",
  files: [
    { path: "email.md", content: "Hi {{recipient_name}}, from {{sender:me}}." },
    { path: "notes.txt", content: "tone {{tone:warm}}" },
  ],
};

describe("buildForkInput", () => {
  it("names the fork and substitutes the user's values into every file", () => {
    const input = buildForkInput(source, { recipient_name: "Sarah", sender: "Ada" });
    expect(input).toEqual({
      name: "Cold email (fork)",
      description: "A cold outreach email",
      category: "Marketing",
      files: [
        { path: "email.md", content: "Hi Sarah, from Ada." },
        { path: "notes.txt", content: "tone warm" },
      ],
    });
  });

  it("applies template defaults when a value is not provided", () => {
    const input = buildForkInput(source, { recipient_name: "Bob" });
    expect(input.files![0].content).toBe("Hi Bob, from me.");
    expect(input.files![1].content).toBe("tone warm");
  });
});
