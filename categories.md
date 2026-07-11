---
layout: default
title: 分類
permalink: /categories/
---
<div class="wrap">
{% assign sorted_categories = site.categories | sort %}
{% for category in sorted_categories %}
  <div class="category-block">
    <h2>{{ category[0] }}</h2>
    <ul>
      {% for post in category[1] %}
        <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a> <span class="meta">（{{ post.date | date: "%Y-%m-%d" }}）</span></li>
      {% endfor %}
    </ul>
  </div>
{% endfor %}
</div>
