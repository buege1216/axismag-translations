---
layout: page
title: 分類
permalink: /categories/
---

{% assign sorted_categories = site.categories | sort %}
{% for category in sorted_categories %}
  <h3 id="{{ category[0] }}">{{ category[0] }}</h3>
  <ul>
    {% for post in category[1] %}
      <li>
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        <small>({{ post.date | date: "%Y-%m-%d" }})</small>
      </li>
    {% endfor %}
  </ul>
{% endfor %}
