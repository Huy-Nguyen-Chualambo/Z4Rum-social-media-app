import assert from "node:assert/strict";
import { test } from "node:test";
import { BLOCKED_POST_TERMS, containsBlockedPostTerm, validatePostContent } from "../src/utils/postModeration";

test("blocks every configured term in a post", () => {
  for (const term of BLOCKED_POST_TERMS) {
    assert.equal(containsBlockedPostTerm(`Nội dung ${term}!`), true, term);
  }
});

test("normalizes case, Unicode, invisible characters and phrase separators", () => {
  for (const content of ["SEX!", "ｓｅｘ", "se\u200bx", "nứng".normalize("NFD"), "ĐỊT\nMẸ", "khieu---dam"]) {
    assert.equal(containsBlockedPostTerm(content), true, content);
  }
});

test("does not match inside ordinary words or remove Vietnamese accents", () => {
  for (const content of ["Sussex", "Essex", "class", "account", "đủ", "đùm bọc", "đám mây", "lon nước", "dam", "du lịch", "Hôm nay trời đẹp"]) {
    assert.equal(containsBlockedPostTerm(content), false, content);
  }
});

test("rejects invalid content and allows valid content", () => {
  for (const content of [undefined, null, 42, {}, [], "", "  ", "sex"]) {
    assert.equal(typeof validatePostContent(content), "string");
  }
  assert.equal(validatePostContent("Bài viết hợp lệ"), null);
});
